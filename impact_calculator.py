#!/usr/bin/env python3
"""
Synerxus Impact Calculator - Attributable Contribution Methodology
This module calculates verified, auditable impact linked to SDG commitments.

Impact is only attributed to SDGs that the volunteer/organization has explicitly committed to.
"""

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
    total_project_output,
    volunteer_committed_sdgs,
    organization_committed_sdgs,
    sdg_number
):
    """
    Recalculate impact using the Synerxus Attributable Contribution methodology.
    
    Impact is ONLY generated if the SDG is in both volunteer AND organization commitments.
    
    Args:
        project_id (str): The project identifier
        sdg_target (str): The SDG target (e.g., "SDG 6.1")
        baseline (float): Original KPI baseline value
        final (float): Final KPI value after project completion
        volunteer_output (float): Verified output from this volunteer
        total_project_output (float): Total project output from all contributors
        volunteer_committed_sdgs (list): SDGs the volunteer committed to (1-17)
        organization_committed_sdgs (list): SDGs the organization committed to (1-17)
        sdg_number (int): The SDG number (1-17) to attribute impact to
    
    Returns:
        dict: Detailed impact calculation with SDG validation
    
    Raises:
        ValueError: If SDG is not in volunteer/organization commitments
    """
    
    # VALIDATION STEP: Check SDG Commitment
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
            "sdg_number": sdg_number,
        }
    
    # STEP 1: Calculate the SDG Delta (the verified movement of the needle)
    delta = final - baseline
    
    # STEP 2: Calculate the Contribution Ratio (volunteer's slice of the work)
    if total_project_output == 0:
        ratio = 0
    else:
        ratio = volunteer_output / total_project_output
    
    # STEP 3: Calculate Attributable Impact (what the volunteer truly owns)
    attributable_contribution = ratio * delta
    
    return {
        "status": "SUCCESS",
        "project_id": project_id,
        "sdg_target": sdg_target,
        "sdg_number": sdg_number,
        "sdg_name": SDGCommitmentValidator.SDG_NAMES.get(sdg_number, "Unknown"),
        "baseline": baseline,
        "final": final,
        "delta": delta,
        "volunteer_output": volunteer_output,
        "total_project_output": total_project_output,
        "contribution_ratio": round(ratio * 100, 2),
        "attributable_contribution": round(attributable_contribution, 2),
        "volunteer_committed_sdgs": volunteer_committed_sdgs,
        "organization_committed_sdgs": organization_committed_sdgs,
    }


def format_impact_report(result):
    """Format impact calculation into a readable before/after report."""
    
    if result.get("status") == "FAILED":
        print("\n" + "="*80)
        print("❌ IMPACT CALCULATION FAILED - SDG COMMITMENT VALIDATION")
        print("="*80)
        print(result.get("error"))
        print("="*80 + "\n")
        return
    
    print("\n" + "="*80)
    print("SYNERXUS IMPACT RECALCULATION REPORT")
    print("="*80)
    
    print(f"\n📊 PROJECT: {result['project_id']}")
    print(f"🎯 SDG TARGET: {result['sdg_target']}")
    print(f"🌍 ATTRIBUTED SDG: SDG {result['sdg_number']} - {result['sdg_name']}")
    
    print("\n" + "-"*80)
    print("✅ SDG COMMITMENT VALIDATION:")
    print("-"*80)
    volunteer_sdgs = [f"SDG {num}: {SDGCommitmentValidator.SDG_NAMES[num]}" for num in sorted(result['volunteer_committed_sdgs'])]
    org_sdgs = [f"SDG {num}: {SDGCommitmentValidator.SDG_NAMES[num]}" for num in sorted(result['organization_committed_sdgs'])]
    print(f"  Volunteer committed to: {', '.join(volunteer_sdgs)}")
    print(f"  Organization committed to: {', '.join(org_sdgs)}")
    print(f"  ✓ Impact approved for: SDG {result['sdg_number']} ({result['sdg_name']})")
    
    print("\n" + "-"*80)
    print("❌ LEGACY/ERRONEOUS REPORT (What the old system would claim):")
    print("-"*80)
    print(f"  'Volunteer participated in a project that served {result['final']} people.'")
    print(f"  → This falsely implies the volunteer is responsible for ALL {result['final']} units")
    print(f"  → AUDIT RISK: No SDG tracking, no verification capability")
    
    print("\n" + "-"*80)
    print("✅ NEW VERIFIED REPORT (Synerxus Attributable Contribution):")
    print("-"*80)
    print(f"  Baseline KPI (SDG {result['sdg_number']}):    {result['baseline']} units")
    print(f"  Final KPI (SDG {result['sdg_number']}):      {result['final']} units")
    print(f"  ───────────────────────────────────────────")
    print(f"  Delta (verified change):     {result['delta']} units")
    print(f"\n  Volunteer Contribution:      {result['volunteer_output']} of {result['total_project_output']} units")
    print(f"  Ratio (% of work):           {result['contribution_ratio']}%")
    print(f"\n  ✓ Attributable Impact:       {result['attributable_contribution']} units")
    print(f"    └─ This volunteer is verifiably responsible for {result['attributable_contribution']} of the {result['delta']} unit")
    print(f"       increase toward SDG {result['sdg_number']} ({result['sdg_name']})")
    
    print("\n" + "-"*80)
    print("📋 AUDIT TRAIL:")
    print("-"*80)
    print(f"  SDG Commitment: ✓ VERIFIED (volunteer & organization committed)")
    print(f"  Formula: Impact = Ratio × Delta")
    print(f"  Calculation: {result['contribution_ratio']}% × {result['delta']} = {result['attributable_contribution']}")
    print(f"  Status: ✓ AUDITABLE - Every number is verifiable from project data")
    
    print("\n" + "="*80)


if __name__ == "__main__":
    print("\n🧪 RUNNING IMPACT RECALCULATION TEST")
    print("   Using test data: Lakeside_Water_01 (SDG 6: Clean Water and Sanitation)")
    
    # Test Case 1: SUCCESS - SDG is in both commitments
    print("\n" + "="*80)
    print("TEST 1: VALID - Impact attributed to committed SDG")
    print("="*80)
    
    result1 = recalculate_impact(
        project_id="Lakeside_Water_01",
        sdg_target="SDG 6.1",
        baseline=1000,
        final=1200,
        volunteer_output=10,
        total_project_output=50,
        volunteer_committed_sdgs=[6, 13],  # Volunteer committed to SDG 6 & 13
        organization_committed_sdgs=[5, 6, 17],  # Org committed to SDG 5, 6, 17
        sdg_number=6  # Calculating impact for SDG 6
    )
    
    format_impact_report(result1)
    
    # Test Case 2: FAILURE - SDG not in volunteer commitments
    print("\n" + "="*80)
    print("TEST 2: INVALID - Impact attributed to uncommitted SDG (volunteer)")
    print("="*80)
    
    result2 = recalculate_impact(
        project_id="Lakeside_Water_01",
        sdg_target="SDG 3.2",
        baseline=500,
        final=750,
        volunteer_output=20,
        total_project_output=100,
        volunteer_committed_sdgs=[6, 13],  # Volunteer ONLY committed to SDG 6 & 13
        organization_committed_sdgs=[3, 6],  # Org committed to SDG 3, 6
        sdg_number=3  # ❌ Trying to calculate impact for SDG 3 (not in volunteer's commitment)
    )
    
    format_impact_report(result2)
    
    # Test Case 3: FAILURE - SDG not in organization commitments
    print("\n" + "="*80)
    print("TEST 3: INVALID - Impact attributed to uncommitted SDG (organization)")
    print("="*80)
    
    result3 = recalculate_impact(
        project_id="Urban_Green_02",
        sdg_target="SDG 7.2",
        baseline=200,
        final=350,
        volunteer_output=15,
        total_project_output=75,
        volunteer_committed_sdgs=[7, 11],  # Volunteer committed to SDG 7 & 11
        organization_committed_sdgs=[11, 13],  # Org committed to SDG 11, 13 (NOT 7!)
        sdg_number=7  # ❌ Trying to calculate impact for SDG 7 (not in org's commitment)
    )
    
    format_impact_report(result3)
    
    print("\n🎓 KEY INSIGHTS:")
    print("  ✓ Impact is ONLY generated when:")
    print("    1. Volunteer has committed to the SDG")
    print("    2. Organization has committed to the SDG")
    print("    3. BOTH conditions are met")
    print("\n  ❌ Impact calculation is REJECTED when:")
    print("    1. Volunteer hasn't committed to that SDG")
    print("    2. OR organization hasn't committed to that SDG")
    print("\n✅ This ensures impact attribution is aligned with actual commitments!\n")
