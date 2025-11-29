#!/usr/bin/env python3
"""
Synerxus Impact Calculator - Attributable Contribution Methodology
This module calculates verified, auditable impact using the new attribution model.
"""

def recalculate_impact(project_id, sdg_target, baseline, final, volunteer_output, total_project_output):
    """
    Recalculate impact using the Synerxus Attributable Contribution methodology.
    
    Args:
        project_id (str): The project identifier
        sdg_target (str): The SDG target (e.g., "SDG 6.1")
        baseline (float): Original KPI baseline value
        final (float): Final KPI value after project completion
        volunteer_output (float): Verified output from this volunteer/team
        total_project_output (float): Total project output from all contributors
    
    Returns:
        dict: Detailed impact calculation with before/after comparison
    """
    
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
        "project_id": project_id,
        "sdg_target": sdg_target,
        "baseline": baseline,
        "final": final,
        "delta": delta,
        "volunteer_output": volunteer_output,
        "total_project_output": total_project_output,
        "contribution_ratio": round(ratio * 100, 2),
        "attributable_contribution": round(attributable_contribution, 2),
    }


def format_impact_report(result):
    """Format impact calculation into a readable before/after report."""
    
    print("\n" + "="*80)
    print("SYNERXUS IMPACT RECALCULATION REPORT")
    print("="*80)
    
    print(f"\n📊 PROJECT: {result['project_id']}")
    print(f"🎯 SDG TARGET: {result['sdg_target']}")
    
    print("\n" + "-"*80)
    print("❌ LEGACY/ERRONEOUS REPORT (What the old system would claim):")
    print("-"*80)
    print(f"  'Volunteer participated in a project that served {result['final']} people.'")
    print(f"  → This falsely implies the volunteer is responsible for ALL {result['final']} units")
    print(f"  → AUDIT RISK: Impossible to verify, inflates volunteer contribution")
    
    print("\n" + "-"*80)
    print("✅ NEW VERIFIED REPORT (Synerxus Attributable Contribution):")
    print("-"*80)
    print(f"  Baseline KPI:              {result['baseline']} units")
    print(f"  Final KPI:                 {result['final']} units")
    print(f"  ───────────────────────────")
    print(f"  Delta (verified change):   {result['delta']} units")
    print(f"\n  Volunteer Contribution:    {result['volunteer_output']} of {result['total_project_output']} units")
    print(f"  Ratio (% of work):         {result['contribution_ratio']}%")
    print(f"\n  ✓ Attributable Impact:     {result['attributable_contribution']} units")
    print(f"    └─ This volunteer is verifiably responsible for {result['attributable_contribution']} of the {result['delta']} unit increase")
    
    print("\n" + "-"*80)
    print("📋 AUDIT TRAIL:")
    print("-"*80)
    print(f"  Formula: Impact = Ratio × Delta")
    print(f"  Calculation: {result['contribution_ratio']}% × {result['delta']} = {result['attributable_contribution']}")
    print(f"  Status: ✓ AUDITABLE - Every number is verifiable from project data")
    
    print("\n" + "="*80)


if __name__ == "__main__":
    # TEST CASE: Lakeside_Water_01 Project
    print("\n🧪 RUNNING IMPACT RECALCULATION TEST")
    print("   Using provided test data: Lakeside_Water_01")
    
    result = recalculate_impact(
        project_id="Lakeside_Water_01",
        sdg_target="SDG 6.1",
        baseline=1000,
        final=1200,
        volunteer_output=10,
        total_project_output=50
    )
    
    # Display the formatted report
    format_impact_report(result)
    
    print("\n🎓 KEY INSIGHTS:")
    print(f"  • Delta: The project increased impact by 200 units (from 1000 → 1200)")
    print(f"  • Ratio: This volunteer contributed 20% of the work (10 of 50 tasks)")
    print(f"  • Result: Volunteer is responsible for 40 units of the 200-unit increase")
    print(f"  • Verification: 40 ÷ 200 = 20% ✓ (matches contribution ratio)")
    print("\n✅ Impact recalculation complete and auditable!\n")
