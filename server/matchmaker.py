#!/usr/bin/env python3
"""
Matchmaker - AI-powered volunteer-organization matching algorithm
Matches volunteers with organizations based on skills, interests, location, and SDG goals
"""

import json
import sys
from typing import List, Dict, Any, Tuple


def calculate_skill_match(volunteer_skills: List[str], org_needs: List[str]) -> Tuple[float, str]:
    """
    Calculate skill matching score (0-100)
    Weight: 35% of total score
    """
    if not org_needs:
        return 70.0, "No specific skills required"
    
    if not volunteer_skills:
        return 0.0, "No skills listed"
    
    # Normalize to lowercase for comparison
    v_skills = [s.lower().strip() for s in volunteer_skills]
    o_needs = [n.lower().strip() for n in org_needs]
    
    # Find matching skills (exact or partial matches)
    matching = []
    for skill in v_skills:
        for need in o_needs:
            if skill in need or need in skill:
                matching.append(skill)
                break
    
    if not matching:
        return 0.0, "No matching skills"
    
    # Calculate percentage of organization needs met
    score = min((len(matching) / len(o_needs)) * 100, 100)
    
    reason = f"{len(matching)} matching skill{'s' if len(matching) > 1 else ''}: {', '.join(matching[:3])}"
    if len(matching) > 3:
        reason += f" and {len(matching) - 3} more"
    
    return score, reason


def calculate_location_match(vol_location: str, org_location: str) -> Tuple[float, str]:
    """
    Calculate location matching score (0-100)
    Weight: 25% of total score
    """
    if not vol_location or not org_location:
        return 50.0, "Location information incomplete"
    
    vol_loc = vol_location.lower().strip()
    org_loc = org_location.lower().strip()
    
    # Exact match
    if vol_loc == org_loc:
        return 100.0, "Same location"
    
    # Check if one contains the other
    if vol_loc in org_loc or org_loc in vol_loc:
        return 100.0, "Same location"
    
    # Check for same region/city
    vol_parts = [p.strip() for p in vol_loc.split(',')]
    org_parts = [p.strip() for p in org_loc.split(',')]
    
    for v_part in vol_parts:
        for o_part in org_parts:
            if v_part in o_part or o_part in v_part:
                return 60.0, "Same region/area"
    
    return 20.0, "Different locations"


def calculate_interest_match(volunteer_interests: List[str], org_mission: str, org_needs: List[str]) -> Tuple[float, str]:
    """
    Calculate interest/cause alignment score (0-100)
    Weight: 20% of total score
    """
    if not volunteer_interests:
        return 50.0, "No interests specified"
    
    # Combine org mission and needs for matching
    org_text = (org_mission + " " + " ".join(org_needs)).lower()
    
    v_interests = [i.lower().strip() for i in volunteer_interests]
    
    # Find matching interests
    matching = [interest for interest in v_interests if interest in org_text]
    
    if not matching:
        return 30.0, "Limited interest alignment"
    
    score = min((len(matching) / len(v_interests)) * 100, 100)
    reason = f"Aligned with {', '.join(matching[:2])}"
    if len(matching) > 2:
        reason += f" and {len(matching) - 2} more interests"
    
    return score, reason


def calculate_sdg_match(volunteer_sdgs: List[int], org_sdgs: List[int]) -> Tuple[float, str]:
    """
    Calculate SDG goals alignment score (0-100)
    Weight: 20% of total score
    """
    if not volunteer_sdgs and not org_sdgs:
        return 50.0, "No SDG goals specified"
    
    if not volunteer_sdgs or not org_sdgs:
        return 30.0, "Incomplete SDG information"
    
    # Find common SDG goals
    common_sdgs = set(volunteer_sdgs) & set(org_sdgs)
    
    if not common_sdgs:
        return 20.0, "No common SDG goals"
    
    # Score based on percentage of alignment
    score = min((len(common_sdgs) / max(len(volunteer_sdgs), len(org_sdgs))) * 100, 100)
    
    reason = f"Common SDG goal{'s' if len(common_sdgs) > 1 else ''}: {', '.join(f'#{sdg}' for sdg in sorted(common_sdgs))}"
    
    return score, reason


def compute_match_score(volunteer: Dict[str, Any], organization: Dict[str, Any]) -> Dict[str, Any]:
    """
    Calculate overall match score between a volunteer and organization
    
    Returns a dictionary with:
    - score: Overall match score (0-100)
    - breakdown: Individual component scores
    - reasons: List of matching reasons
    """
    
    # Calculate individual component scores
    skill_score, skill_reason = calculate_skill_match(
        volunteer.get('skills', []),
        organization.get('needs', [])
    )
    
    location_score, location_reason = calculate_location_match(
        volunteer.get('location', ''),
        organization.get('location', '')
    )
    
    interest_score, interest_reason = calculate_interest_match(
        volunteer.get('interests', []),
        organization.get('mission', ''),
        organization.get('needs', [])
    )
    
    sdg_score, sdg_reason = calculate_sdg_match(
        volunteer.get('sdgGoals', []),
        organization.get('sdgFocus', [])
    )
    
    # Calculate weighted final score
    # Weights: Skills 35%, Location 25%, Interests 20%, SDGs 20%
    final_score = (
        (skill_score * 0.35) +
        (location_score * 0.25) +
        (interest_score * 0.20) +
        (sdg_score * 0.20)
    )
    
    # Round to 2 decimal places
    final_score = round(final_score, 2)
    
    # Build reasons list
    reasons = []
    
    # Add quality indicator
    if final_score >= 80:
        reasons.append("⭐ Excellent match")
    elif final_score >= 60:
        reasons.append("✨ Good match")
    elif final_score >= 40:
        reasons.append("👍 Fair match")
    else:
        reasons.append("🤔 Limited compatibility")
    
    # Add specific reasons
    if skill_score > 0:
        reasons.append(skill_reason)
    if location_score >= 60:
        reasons.append(location_reason)
    if interest_score >= 50:
        reasons.append(interest_reason)
    if sdg_score >= 50:
        reasons.append(sdg_reason)
    
    return {
        'volunteer_id': volunteer.get('id'),
        'organization_id': organization.get('id'),
        'score': final_score,
        'breakdown': {
            'skillMatch': round(skill_score, 2),
            'locationMatch': round(location_score, 2),
            'interestMatch': round(interest_score, 2),
            'sdgMatch': round(sdg_score, 2)
        },
        'reasons': reasons
    }


def match_volunteers(volunteers: List[Dict[str, Any]], 
                    organizations: List[Dict[str, Any]], 
                    threshold: float = 40.0) -> List[Dict[str, Any]]:
    """
    Match all volunteers with all organizations and return matches above threshold
    
    Args:
        volunteers: List of volunteer profiles
        organizations: List of organization profiles
        threshold: Minimum score threshold (default: 40.0)
    
    Returns:
        List of matches sorted by score (highest first)
    """
    matches = []
    
    for volunteer in volunteers:
        for organization in organizations:
            match_result = compute_match_score(volunteer, organization)
            
            # Only include matches above threshold
            if match_result['score'] >= threshold:
                matches.append(match_result)
    
    # Sort by score (highest first)
    matches.sort(key=lambda x: x['score'], reverse=True)
    
    return matches


def main():
    """
    Main entry point - reads JSON input from stdin and outputs matches to stdout
    """
    try:
        # Read input from stdin
        input_data = json.load(sys.stdin)
        
        volunteers = input_data.get('volunteers', [])
        organizations = input_data.get('organizations', [])
        threshold = input_data.get('threshold', 40.0)
        
        # Compute matches
        matches = match_volunteers(volunteers, organizations, threshold)
        
        # Output results as JSON
        result = {
            'success': True,
            'matches': matches,
            'stats': {
                'total_volunteers': len(volunteers),
                'total_organizations': len(organizations),
                'matches_found': len(matches),
                'threshold': threshold
            }
        }
        
        print(json.dumps(result, indent=2))
        sys.exit(0)
        
    except Exception as e:
        # Output error as JSON
        error_result = {
            'success': False,
            'error': str(e),
            'error_type': type(e).__name__
        }
        print(json.dumps(error_result, indent=2))
        sys.exit(1)


if __name__ == '__main__':
    main()
