#!/usr/bin/env python3
"""
Synerxus Impact Calculator - Attributable Contribution Methodology
This module calculates verified, auditable impact linked to SDG commitments.

Impact is only attributed to SDGs that the volunteer/organization has explicitly committed to.
"""

import json

class SDGCommitmentValidator:
    """Validates that impacts are attributed to committed SDGs."""
    
    SDG_NAMES = {
        1: "No Poverty",
        2: "Zero Hunger",
        3: "Good Health and Well-Being",
        4: "Quality Education",
        5: "Gender Equality",
        6: "Clean Water and Sanitation",
        7: "Affordable and Clean Energy",
        8: "Decent Work and Economic Growth",
        9: "Industry, Innovation and Infrastructure",
        10: "Reduced Inequalities",
        11: "Sustainable Cities and Communities",
        12: "Responsible Consumption and Production",
        13: "Climate Action",
        14: "Life Below Water",
        15: "Life on Land",
        16: "Peace, Justice and Strong Institutions",
        17: "Partnerships for the Goals",
    }
    
    def __init__(self, committed_sdgs):
        """
        Initialize validator with committed SDGs.
        
        Args:
            committed_sdgs (list): List of SDG numbers (1-17) the volunteer/org committed to
        """
        self.committed_sdgs = set(committed_sdgs)
    
    def validate_sdg(self, sdg_number):
        """
        Validate that the SDG is in the commitment list.
        
        Args:
            sdg_number (int): SDG number to validate (1-17)
        
        Returns:
            bool: True if SDG is committed, False otherwise
        
        Raises:
            ValueError: If SDG is not in committed list
        """
        if sdg_number not in self.committed_sdgs:
            committed_names = [f"SDG {num}: {self.SDG_NAMES[num]}" for num in sorted(self.committed_sdgs)]
            raise ValueError(
                f"\n❌ SDG {sdg_number} ({self.SDG_NAMES.get(sdg_number, 'Unknown')}) is NOT in committed SDGs.\n"
                f"   Committed SDGs: {', '.join(committed_names)}\n"
                f"   Impact CANNOT be attributed to an uncommitted SDG."
            )
        return True


def recalculate_impact(
    project_id, 
    sdg_target,
    baseline, 
    final, 
    volunteer_output, 
    volunteer_target_goal,
    total_project_output,
    volunteer_committed_sdgs=None,
    organization_committed_sdgs=None,
    sdg_number=None
):
    """
    Recalculate impact using the Synerxus Attributable Contribution methodology.
    
    Produces TWO metrics:
    1. Attributable Contribution: The absolute number for audit ledger
    2. Impact Score (0-100): Normalized score for user dashboard
    
    Args:
        project_id (str): The project identifier
        sdg_target (str): The SDG target (e.g., "SDG 6.1")
        baseline (float): Original KPI baseline value
        final (float): Final KPI value after project completion
        volunteer_output (float): Verified output from this volunteer
        volunteer_target_goal (float): What volunteer was assigned to do
        total_project_output (float): Total project output from all contributors
        volunteer_committed_sdgs (list): SDGs the volunteer committed to (optional)
        organization_committed_sdgs (list): SDGs the organization committed to (optional)
        sdg_number (int): The SDG number (1-17) to attribute impact to (optional)
    
    Returns:
        dict: Detailed impact calculation with both metrics
    """
    
    # Extract SDG number from sdg_target if not provided (e.g., "SDG 6.1" -> 6)
    if sdg_number is None and sdg_target:
        try:
            sdg_number = int(sdg_target.split()[1].split('.')[0])
        except:
            sdg_number = None
    
    # VALIDATION STEP: Check SDG Commitment (if commitments provided)
    if volunteer_committed_sdgs and organization_committed_sdgs and sdg_number:
        volunteer_validator = SDGCommitmentValidator(volunteer_committed_sdgs)
        org_validator = SDGCommitmentValidator(organization_committed_sdgs)
        
        try:
            volunteer_validator.validate_sdg(sdg_number)
            org_validator.validate_sdg(sdg_number)
        except ValueError as e:
            return {
                "status": "FAILED",
                "error": str(e),
                "project_id": project_id,
                "sdg_target": sdg_target,
            }
    
    # STEP 1: Calculate the SDG Delta (the verified movement of the needle)
    delta = final - baseline
    
    # STEP 2: Calculate the Contribution Ratio (volunteer's slice of the work)
    if total_project_output == 0:
        ratio = 0
    else:
        ratio = volunteer_output / total_project_output
    
    # Calculate Attributable Contribution
    attributable_contribution = ratio * delta
    
    # STEP 3: Calculate Impact Score (Goal Achievement Method)
    # Formula: min((Verified_Output / Volunteer_Target) * 100, 100)
    if volunteer_target_goal == 0:
        impact_score = 0
    else:
        impact_score = min((volunteer_output / volunteer_target_goal) * 100, 100)
    
    return {
        "status": "SUCCESS",
        "project_id": project_id,
        "sdg_target": sdg_target,
        "sdg_number": sdg_number,
        "baseline": baseline,
        "final": final,
        "delta": delta,
        "volunteer_output": volunteer_output,
        "volunteer_target_goal": volunteer_target_goal,
        "total_project_output": total_project_output,
        "contribution_ratio": round(ratio * 100, 2),
        "attributable_contribution": round(attributable_contribution, 2),
        "impact_score": round(impact_score, 2),
    }


def format_narrative_report(result):
    """Format impact calculation into a step-by-step narrative with JSON output."""
    
    if result.get("status") == "FAILED":
        print("\n" + "="*80)
        print("❌ IMPACT CALCULATION FAILED")
        print("="*80)
        print(result.get("error"))
        print("="*80 + "\n")
        return
    
    print("\n" + "="*80)
    print("SYNERXUS IMPACT RECALCULATION REPORT")
    print("="*80)
    
    print(f"\n📊 PROJECT: {result['project_id']}")
    print(f"🎯 SDG TARGET: {result['sdg_target']}")
    
    # NARRATIVE STEPS
    print("\n" + "-"*80)
    print("📋 CALCULATION STEPS:")
    print("-"*80)
    
    print(f"\n✓ Step 1: SDG Delta is {result['delta']}.")
    print(f"  └─ Baseline: {result['baseline']} → Final: {result['final']}")
    
    print(f"\n✓ Step 2: Volunteer Attribution is {result['attributable_contribution']} (Absolute Impact).")
    print(f"  └─ Contribution Ratio: {result['contribution_ratio']}% × Delta {result['delta']} = {result['attributable_contribution']}")
    
    print(f"\n✓ Step 3: Volunteer Target was {result['volunteer_target_goal']}. They achieved {result['volunteer_output']}.")
    print(f"  └─ Output Achievement: {result['volunteer_output']} / {result['volunteer_target_goal']} = {(result['volunteer_output'] / result['volunteer_target_goal'] * 100):.1f}%")
    
    print(f"\n✓ Step 4: SYNERXUS IMPACT SCORE: {int(result['impact_score'])}/100.")
    print(f"  └─ Score Formula: min((Verified_Output / Volunteer_Target) × 100, 100) = {result['impact_score']}")
    
    print("\n" + "-"*80)
    print("📊 JSON OUTPUT:")
    print("-"*80)
    
    json_output = {
        "project_id": result['project_id'],
        "sdg_target": result['sdg_target'],
        "metrics": {
            "attributable_contribution": result['attributable_contribution'],
            "impact_score": result['impact_score'],
        },
        "audit_trail": {
            "baseline_kpi": result['baseline'],
            "final_kpi": result['final'],
            "delta": result['delta'],
            "volunteer_output": result['volunteer_output'],
            "volunteer_target_goal": result['volunteer_target_goal'],
            "contribution_ratio_percent": result['contribution_ratio'],
            "total_project_output": result['total_project_output'],
        }
    }
    
    print(json.dumps(json_output, indent=2))
    
    print("\n" + "="*80)
    print("📈 DASHBOARD DISPLAY:")
    print("="*80)
    print(f"  Attributable Impact (Audit Ledger): {result['attributable_contribution']} units")
    print(f"  Impact Score (User Dashboard):      {int(result['impact_score'])}/100")
    print("="*80 + "\n")


if __name__ == "__main__":
    print("\n🧪 RUNNING IMPACT RECALCULATION TEST")
    print("   Using test data: Lakeside_Water_01 (SDG 6: Clean Water and Sanitation)")
    
    result = recalculate_impact(
        project_id="Lakeside_Water_01",
        sdg_target="SDG 6.1",
        baseline=1000,
        final=1200,
        volunteer_output=8,
        volunteer_target_goal=10,
        total_project_output=50,
        volunteer_committed_sdgs=[6, 13],
        organization_committed_sdgs=[5, 6, 17],
        sdg_number=6
    )
    
    format_narrative_report(result)
    
    print("\n" + "="*80)
    print("🎓 TWO-METRIC SYSTEM EXPLAINED:")
    print("="*80)
    print("\n1️⃣ ATTRIBUTABLE CONTRIBUTION (Audit Ledger):")
    print("   • Measures: Verified share of the delta")
    print("   • Formula: Ratio × Delta = {contribution_ratio}% × {delta} = {attributable_contribution}")
    print("   • Purpose: Verify what volunteer is responsible for in project outcomes")
    print("   • Audience: Auditors, impact leaders, compliance team")
    
    print("\n2️⃣ IMPACT SCORE 0-100 (User Dashboard):")
    print("   • Measures: Goal achievement against volunteer's target")
    print("   • Formula: min((Volunteer_Output / Volunteer_Target) × 100, 100)")
    print("   • Purpose: Show individual performance & motivation")
    print("   • Audience: Volunteers, organization managers, dashboards")
    print("   • Capped at 100: Over-performance doesn't break UI")
    
    print("\n✅ Both metrics are independent and serve different purposes!")
    print("   • Attributable: Organizational impact measurement")
    print("   • Impact Score: Individual performance recognition")
    print("="*80 + "\n")
