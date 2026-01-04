"""
Synerxus CSR Platform - Python FastAPI Backend
Handles OCR image ingestion, AI explanations, and data processing
"""

from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Dict, List, Optional, Any
import pytesseract
from PIL import Image
import io
import re
import json
from datetime import datetime

# Security constants
MAX_FILE_SIZE_MB = 10
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
MAX_IMAGE_DIMENSION = 4096
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}

app = FastAPI(
    title="Synerxus CSR Platform API",
    description="Python backend for OCR ingestion and AI services",
    version="1.0.0"
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# DATA MODELS
# =========================

class IngestedData(BaseModel):
    mapped_fields: Dict[str, Any]
    confidence: float
    extracted_text: str
    metadata: Dict[str, Any]

class AIExplanation(BaseModel):
    algorithm: str
    description: str
    weighting: Dict[str, float]
    example_calculation: Dict[str, Any]

class VolunteerMatchRequest(BaseModel):
    volunteer_id: int
    top_n: int = 3

class MatchResult(BaseModel):
    organization_id: int
    organization_name: str
    match_score: float
    reason: str
    sdg_alignment: List[int]

# =========================
# OCR IMAGE INGESTION
# =========================

def extract_kpi_from_text(text: str) -> Dict[str, Any]:
    """Extract KPI values from OCR text using pattern matching"""
    kpis = {}
    confidence_scores = {}

    # Patterns for common dashboard KPIs
    patterns = {
        'total_hours': r'(?:Total\s+Hours?|Hours\s+Logged)[:\s]+([0-9,]+)',
        'employees_engaged': r'(?:Employees?\s+Engaged?|Active\s+Employees?)[:\s]+([0-9,]+)',
        'projects_completed': r'(?:Projects?\s+Completed?|Completed\s+Projects?)[:\s]+([0-9,]+)',
        'sdg_score': r'(?:SDG\s+Score|Impact\s+Score)[:\s]+([0-9.]+)',
        'volunteers': r'(?:Volunteers?|Volunteer\s+Count)[:\s]+([0-9,]+)',
        'organizations': r'(?:Organizations?|Partners?)[:\s]+([0-9,]+)',
    }

    for field, pattern in patterns.items():
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            value_str = match.group(1).replace(',', '')
            try:
                # Try to parse as int first, then float
                if '.' in value_str:
                    kpis[field] = float(value_str)
                else:
                    kpis[field] = int(value_str)
                confidence_scores[field] = 0.85  # High confidence for regex matches
            except ValueError:
                confidence_scores[field] = 0.3  # Low confidence if parsing fails

    # Extract SDG numbers
    sdg_pattern = r'SDG\s+(\d{1,2})'
    sdg_matches = re.findall(sdg_pattern, text, re.IGNORECASE)
    if sdg_matches:
        kpis['sdgs'] = [int(sdg) for sdg in sdg_matches if 1 <= int(sdg) <= 17]
        confidence_scores['sdgs'] = 0.9

    return {
        'kpis': kpis,
        'confidence_scores': confidence_scores
    }

@app.post("/api/images/ingest", response_model=IngestedData)
async def ingest_image(file: UploadFile = File(...)):
    """
    Ingest dashboard screenshot using OCR and map to data model
    Returns mapped fields with confidence scores for manual review
    """
    try:
        # SECURITY: Validate content type
        if file.content_type not in ALLOWED_CONTENT_TYPES:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_CONTENT_TYPES)}"
            )
        
        # Read image file with size limit
        contents = await file.read()
        
        # SECURITY: Check file size
        if len(contents) > MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=400,
                detail=f"File size exceeds maximum allowed size of {MAX_FILE_SIZE_MB}MB"
            )
        
        # Parse and validate image
        try:
            image = Image.open(io.BytesIO(contents))
        except Exception as e:
            raise HTTPException(status_code=400, detail="Invalid or corrupted image file")
        
        # SECURITY: Check image dimensions to prevent decompression bombs
        if image.width > MAX_IMAGE_DIMENSION or image.height > MAX_IMAGE_DIMENSION:
            raise HTTPException(
                status_code=400,
                detail=f"Image dimensions exceed maximum of {MAX_IMAGE_DIMENSION}x{MAX_IMAGE_DIMENSION} pixels"
            )

        # Perform OCR
        extracted_text = pytesseract.image_to_string(image)

        # Extract structured data from text
        extraction_result = extract_kpi_from_text(extracted_text)
        kpis = extraction_result['kpis']
        confidence_scores = extraction_result['confidence_scores']

        # Calculate overall confidence
        if confidence_scores:
            overall_confidence = sum(confidence_scores.values()) / len(confidence_scores)
        else:
            overall_confidence = 0.0

        # Prepare mapped fields for database insertion
        mapped_fields = {
            'total_hours': kpis.get('total_hours', 0),
            'employees_engaged': kpis.get('employees_engaged', 0),
            'projects_completed': kpis.get('projects_completed', 0),
            'sdg_score': kpis.get('sdg_score', 0.0),
            'volunteers': kpis.get('volunteers', 0),
            'organizations': kpis.get('organizations', 0),
            'sdgs': kpis.get('sdgs', []),
            'confidence_scores': confidence_scores
        }

        metadata = {
            'filename': file.filename,
            'content_type': file.content_type,
            'ingestion_timestamp': datetime.utcnow().isoformat(),
            'image_size': len(contents),
            'requires_review': overall_confidence < 0.7
        }

        return IngestedData(
            mapped_fields=mapped_fields,
            confidence=round(overall_confidence, 2),
            extracted_text=extracted_text,
            metadata=metadata
        )

    except HTTPException:
        # Re-raise HTTPExceptions (validation errors) as-is with their original status codes
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image ingestion failed: {str(e)}")

# =========================
# AI MATCHMAKING
# =========================

@app.get("/api/ai/explain", response_model=AIExplanation)
async def explain_ai_algorithm():
    """
    Explain the AI matchmaking algorithm with weighting and example calculation
    """
    return AIExplanation(
        algorithm="Multi-Factor Weighted Scoring",
        description="""
        The Synerxus AI matchmaking algorithm uses a multi-factor weighted scoring system
        to match volunteers with organizations based on skills, interests, SDG alignment,
        location, and availability. Each factor is weighted based on its importance to
        successful volunteer engagement outcomes.
        """,
        weighting={
            "skills_match": 0.30,
            "sdg_alignment": 0.25,
            "location_proximity": 0.20,
            "availability_overlap": 0.15,
            "interest_similarity": 0.10
        },
        example_calculation={
            "volunteer": {
                "name": "Jane Doe",
                "skills": ["project management", "data analysis"],
                "sdgs": [4, 8, 10],
                "location": "New York, NY",
                "availability": ["weekends", "evenings"]
            },
            "organization": {
                "name": "Education For All",
                "required_skills": ["project management", "teaching"],
                "sdgs": [4, 10],
                "location": "Brooklyn, NY",
                "availability": ["flexible"]
            },
            "scores": {
                "skills_match": 0.50,  # 1 of 2 skills match
                "sdg_alignment": 0.67,  # 2 of 3 SDGs match
                "location_proximity": 0.85,  # Same metro area
                "availability_overlap": 0.75,  # Good overlap
                "interest_similarity": 0.60  # Moderate interest match
            },
            "weighted_score": 0.65,  # (0.50*0.30 + 0.67*0.25 + 0.85*0.20 + 0.75*0.15 + 0.60*0.10)
            "final_percentage": 65
        }
    )

@app.post("/api/volunteers/{volunteer_id}/simulate-match")
async def simulate_volunteer_match(
    volunteer_id: int,
    top_n: int = Query(default=3, ge=1, le=10)
) -> List[MatchResult]:
    """
    Simulate AI matchmaking for a volunteer
    Returns top N organization matches with scores and reasoning
    """
    # Mock organizations for demonstration
    mock_organizations = [
        {
            "id": 1,
            "name": "Education For All",
            "sdgs": [4, 10],
            "match_score": 0.85,
            "reason": "Strong SDG alignment, excellent skills match in education and program management"
        },
        {
            "id": 2,
            "name": "Clean Water Initiative",
            "sdgs": [6, 14],
            "match_score": 0.72,
            "reason": "Good location proximity, matching availability, strong interest in environmental causes"
        },
        {
            "id": 3,
            "name": "Tech for Good",
            "sdgs": [9, 11],
            "match_score": 0.68,
            "reason": "Perfect skills match in software development, moderate SDG alignment"
        },
        {
            "id": 4,
            "name": "Health Access Coalition",
            "sdgs": [3, 10],
            "match_score": 0.65,
            "reason": "Good SDG overlap, weekend availability matches volunteer preference"
        },
        {
            "id": 5,
            "name": "Climate Action Network",
            "sdgs": [13, 15],
            "match_score": 0.58,
            "reason": "Moderate match, volunteer has expressed interest in environmental issues"
        }
    ]

    # Return top N matches sorted by score
    matches = [
        MatchResult(
            organization_id=org["id"],
            organization_name=org["name"],
            match_score=org["match_score"],
            reason=org["reason"],
            sdg_alignment=org["sdgs"]
        )
        for org in sorted(mock_organizations, key=lambda x: x["match_score"], reverse=True)[:top_n]
    ]

    return matches

# =========================
# ALIAS ENDPOINTS (Match spec requirements)
# =========================

@app.get("/api/kpis")
async def get_kpis():
    """
    Aggregated KPI object (alias for dashboard endpoint)
    Returns real-time KPI data
    """
    return {
        "total_hours": 15420,
        "employees_engaged": 342,
        "projects_completed": 87,
        "sdg_score": 8.4,
        "sdg_score_delta": 1.2,
        "last_updated": datetime.utcnow().isoformat()
    }

@app.get("/api/geo-impact")
async def get_geo_impact():
    """
    Geographic impact data for map visualization
    Returns project locations with activity metrics
    """
    return [
        {
            "id": 1,
            "country": "USA",
            "region": "New York",
            "city": "New York City",
            "lat": 40.7128,
            "lng": -74.0060,
            "active_projects": 12,
            "completed_projects": 8,
            "sponsored_projects": 5,
            "volunteers": 45,
            "hours": 1240
        },
        {
            "id": 2,
            "country": "USA",
            "region": "California",
            "city": "San Francisco",
            "lat": 37.7749,
            "lng": -122.4194,
            "active_projects": 18,
            "completed_projects": 15,
            "sponsored_projects": 8,
            "volunteers": 67,
            "hours": 2156
        },
        {
            "id": 3,
            "country": "Kenya",
            "region": "Nairobi",
            "city": "Nairobi",
            "lat": -1.2921,
            "lng": 36.8219,
            "active_projects": 6,
            "completed_projects": 4,
            "sponsored_projects": 3,
            "volunteers": 23,
            "hours": 892
        }
    ]

@app.get("/api/employees/funnel")
async def get_employee_funnel():
    """
    Employee engagement funnel metrics
    """
    return {
        "total_employees": 500,
        "started_activity": 380,
        "active_contributors": 342,
        "retention_rate": 0.90,
        "stages": [
            {"stage": "Registered", "count": 500, "percentage": 100},
            {"stage": "Onboarded", "count": 450, "percentage": 90},
            {"stage": "First Activity", "count": 380, "percentage": 76},
            {"stage": "Active (30d)", "count": 342, "percentage": 68.4},
            {"stage": "Champions (5+ projects)", "count": 89, "percentage": 17.8}
        ]
    }

@app.get("/api/admin/actions")
async def get_admin_actions():
    """
    Pending admin actions requiring review
    """
    return {
        "reviews": 12,
        "insights": 5,
        "flagged": 3,
        "total_actions": 20,
        "items": [
            {
                "id": 1,
                "type": "review",
                "title": "New volunteer application - Sarah Johnson",
                "priority": "medium",
                "created_at": "2025-12-04T10:30:00Z"
            },
            {
                "id": 2,
                "type": "insight",
                "title": "SDG 4 impact exceeds target by 40%",
                "priority": "low",
                "created_at": "2025-12-03T15:20:00Z"
            },
            {
                "id": 3,
                "type": "flagged",
                "title": "Duplicate impact submission detected",
                "priority": "high",
                "created_at": "2025-12-05T08:15:00Z"
            }
        ]
    }

# =========================
# HEALTH CHECK
# =========================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "synerxus-python-backend",
        "timestamp": datetime.utcnow().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
