"""
Tests for Synerxus CSR Platform Python Backend
Run with: pytest python_backend/test_main.py -v
"""

import pytest
from fastapi.testclient import TestClient
from io import BytesIO
from PIL import Image
import json

from main import app

client = TestClient(app)


class TestHealthCheck:
    """Test health check endpoint"""

    def test_health_check(self):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "synerxus-python-backend"
        assert "timestamp" in data


class TestAIExplanation:
    """Test AI explanation endpoint"""

    def test_get_ai_explanation(self):
        response = client.get("/api/ai/explain")
        assert response.status_code == 200
        data = response.json()

        # Check structure
        assert "algorithm" in data
        assert "description" in data
        assert "weighting" in data
        assert "example_calculation" in data

        # Check weighting factors
        weighting = data["weighting"]
        assert "skills_match" in weighting
        assert "sdg_alignment" in weighting
        assert "location_proximity" in weighting
        assert "availability_overlap" in weighting
        assert "interest_similarity" in weighting

        # Check weights sum to 1.0
        total_weight = sum(weighting.values())
        assert abs(total_weight - 1.0) < 0.01

        # Check example calculation
        example = data["example_calculation"]
        assert "volunteer" in example
        assert "organization" in example
        assert "scores" in example
        assert "weighted_score" in example
        assert "final_percentage" in example


class TestVolunteerMatching:
    """Test volunteer matchmaking simulation"""

    def test_simulate_match_default(self):
        volunteer_id = 1
        response = client.post(f"/api/volunteers/{volunteer_id}/simulate-match")
        assert response.status_code == 200
        matches = response.json()

        # Should return 3 matches by default
        assert len(matches) == 3
        assert isinstance(matches, list)

        # Check match structure
        for match in matches:
            assert "organization_id" in match
            assert "organization_name" in match
            assert "match_score" in match
            assert "reason" in match
            assert "sdg_alignment" in match
            assert 0 <= match["match_score"] <= 1

        # Matches should be sorted by score descending
        scores = [m["match_score"] for m in matches]
        assert scores == sorted(scores, reverse=True)

    def test_simulate_match_custom_count(self):
        volunteer_id = 1
        top_n = 5
        response = client.post(
            f"/api/volunteers/{volunteer_id}/simulate-match?top_n={top_n}"
        )
        assert response.status_code == 200
        matches = response.json()
        assert len(matches) == top_n

    def test_simulate_match_single(self):
        volunteer_id = 2
        response = client.post(
            f"/api/volunteers/{volunteer_id}/simulate-match?top_n=1"
        )
        assert response.status_code == 200
        matches = response.json()
        assert len(matches) == 1


class TestAliasEndpoints:
    """Test alias endpoints that match spec requirements"""

    def test_get_kpis(self):
        response = client.get("/api/kpis")
        assert response.status_code == 200
        data = response.json()

        assert "total_hours" in data
        assert "employees_engaged" in data
        assert "projects_completed" in data
        assert "sdg_score" in data
        assert "sdg_score_delta" in data
        assert "last_updated" in data

        # Check data types
        assert isinstance(data["total_hours"], (int, float))
        assert isinstance(data["employees_engaged"], int)
        assert isinstance(data["projects_completed"], int)
        assert isinstance(data["sdg_score"], (int, float))

    def test_get_geo_impact(self):
        response = client.get("/api/geo-impact")
        assert response.status_code == 200
        locations = response.json()

        assert isinstance(locations, list)
        assert len(locations) > 0

        # Check structure of each location
        for location in locations:
            assert "id" in location
            assert "country" in location
            assert "region" in location
            assert "lat" in location
            assert "lng" in location
            assert "active_projects" in location
            assert "completed_projects" in location
            assert "sponsored_projects" in location
            assert "volunteers" in location
            assert "hours" in location

            # Validate coordinates
            assert -90 <= location["lat"] <= 90
            assert -180 <= location["lng"] <= 180

    def test_get_employee_funnel(self):
        response = client.get("/api/employees/funnel")
        assert response.status_code == 200
        data = response.json()

        assert "total_employees" in data
        assert "started_activity" in data
        assert "active_contributors" in data
        assert "retention_rate" in data
        assert "stages" in data

        # Check stages
        stages = data["stages"]
        assert isinstance(stages, list)
        for stage in stages:
            assert "stage" in stage
            assert "count" in stage
            assert "percentage" in stage

    def test_get_admin_actions(self):
        response = client.get("/api/admin/actions")
        assert response.status_code == 200
        data = response.json()

        assert "reviews" in data
        assert "insights" in data
        assert "flagged" in data
        assert "total_actions" in data
        assert "items" in data

        # Check items structure
        items = data["items"]
        assert isinstance(items, list)
        for item in items:
            assert "id" in item
            assert "type" in item
            assert "title" in item
            assert "priority" in item
            assert "created_at" in item


class TestImageIngestion:
    """Test image ingestion and OCR functionality"""

    def create_test_image(self, text_content="Total Hours: 15,420\nEmployees Engaged: 342\nProjects Completed: 87\nSDG 4, SDG 8, SDG 10"):
        """Create a simple test image with text"""
        img = Image.new('RGB', (800, 600), color='white')
        return img

    def test_ingest_image_valid(self):
        # Create a simple test image
        img = self.create_test_image()
        img_bytes = BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)

        response = client.post(
            "/api/images/ingest",
            files={"file": ("test_dashboard.png", img_bytes, "image/png")}
        )

        assert response.status_code == 200
        data = response.json()

        # Check response structure
        assert "mapped_fields" in data
        assert "confidence" in data
        assert "extracted_text" in data
        assert "metadata" in data

        # Check mapped fields
        fields = data["mapped_fields"]
        assert "total_hours" in fields
        assert "employees_engaged" in fields
        assert "projects_completed" in fields
        assert "sdg_score" in fields
        assert "confidence_scores" in fields

        # Check metadata
        metadata = data["metadata"]
        assert "filename" in metadata
        assert "content_type" in metadata
        assert "ingestion_timestamp" in metadata
        assert "requires_review" in metadata

        # Confidence should be between 0 and 1
        assert 0 <= data["confidence"] <= 1

    def test_ingest_image_no_file(self):
        response = client.post("/api/images/ingest")
        assert response.status_code == 422  # Validation error

    def test_extracted_text_included(self):
        img = self.create_test_image()
        img_bytes = BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)

        response = client.post(
            "/api/images/ingest",
            files={"file": ("test.png", img_bytes, "image/png")}
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data["extracted_text"], str)


class TestDataValidation:
    """Test data validation and error handling"""

    def test_simulate_match_invalid_top_n(self):
        # Test with top_n = 0 (should fail validation)
        response = client.post("/api/volunteers/1/simulate-match?top_n=0")
        assert response.status_code == 422

    def test_simulate_match_excessive_top_n(self):
        # Test with top_n > 10 (should fail validation)
        response = client.post("/api/volunteers/1/simulate-match?top_n=20")
        assert response.status_code == 422


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
