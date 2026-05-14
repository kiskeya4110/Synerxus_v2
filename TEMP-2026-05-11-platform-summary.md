# TEMP-2026-05-11 Platform Summary

## What Synerxus Contains

Synerxus is organized around claim-level evidence management for ESG, CSR, community investment, volunteering, NGO, and social-impact reporting preparation.

The platform does not present evidence as certification, assurance, or causal impact evidence. It separates confirmed activity, partner-reported figures, source-supported records, and derived mappings so reporting teams can review what is supported and what remains limited.

## Website

The website is built around a single message: claims need evidence trails.

Current website sections include:

1. Hero content focused on claim-level evidence.
2. A problem statement that explains why ESG and social-impact claims are difficult to defend.
3. A workflow section that frames the sequence `Create claim -> Attach evidence -> Confirm -> Map -> Preserve`.
4. Evidence category framing for self-reported, partner-confirmed, source-supported, partner-reported, and mapped records.
5. SDG mapping language that treats mapping as thematic alignment only.
6. A sample evidence summary with a boundary statement.
7. An evidence assessment CTA.
8. Newsletter signup placed in Resources only.

## Platform

The platform modules are consolidated into three main areas:

### 1. Claim-to-Evidence Workspace

This area is for defining the claim and preserving the evidence trail behind it.

It includes:

- Claim register
- Evidence packet detail view
- Source artifact index
- Record metadata

### 2. Confirmation and Evidence Quality

This area separates what is confirmed from what is still incomplete or rejected.

It includes:

- Partner confirmation workflow
- Status reconciliation
- Exception log
- Confidence tiers

### 3. Mapping and Reporting Support

This area supports reporting output without confusing mapping with proof.

It includes:

- SDG / framework mapping
- Report generator
- Assurance-preparation export
- Report summaries

## Report Output

The Evidence Summary report now includes:

- Sample notice and boundary language
- Executive snapshot
- Status reconciliation
- Claim-to-evidence traceability
- Evidence quality and confidence scores
- Exceptions and exclusions
- Partner-reported reach
- SDG-aligned activity mapping
- Methodology and definitions
- Evidence register appendix

The report is written to keep these concepts separate:

## Evidence Status Model

The platform and report separate records into:

- Self-reported records
- Verified / partner-confirmed records
- Source-supported records
- Incomplete records
- Rejected records
- Partner-reported-only figures
- Derived or mapped-only records

These categories should not be blended in dashboards, evidence summaries, SDG mapping views, or report exports.

## Evidence Readiness Assessment

The assessment form at the end of the report was rewritten as an evidence-readiness diagnostic rather than a generic SaaS form.

It now asks for:

- The claim or reporting need
- The program type
- The evidence problem
- Current evidence sources
- Who confirms or reviews records
- Mapping and reporting context
- Evidence scope
- Output needed
- Timing
- Boundary acknowledgment

## Database-Backed Dashboards

The organization dashboards were updated to load from authenticated, database-backed endpoints rather than relying on stale client-side assumptions.

This means the platform now treats dashboard data as live application data instead of static display content.

Dashboard metrics should reflect the authenticated organization context and should not display placeholder, static, or cross-organization data.

## Current Technical Boundaries

The platform still keeps the following boundaries explicit:

- SDG mapping is thematic alignment only
- Framework mapping is reporting context only
- Partner confirmation is not independent assurance
- Source-supported records are distinct from input records
- Partner-reported reach is not automatically verified
- Review readiness is not the same as assurance readiness

## What Synerxus Is Not

Synerxus is not an ESG reporting platform, assurance provider, SDG certifier, impact evaluator, volunteer marketplace, or compliance engine.

It is an evidence infrastructure layer that helps reporting teams organize, confirm, classify, and package evidence behind claims.

## Bottom Line

Synerxus currently contains a focused evidence system for:

- defining claims
- attaching and classifying evidence
- confirming records through partner or verifier workflows
- reconciling statuses and exceptions
- tracking source-support status and preserving source references where available
- mapping records for SDG, framework, or internal reporting context
- generating defensible report outputs for internal review and assurance preparation

It is set up to help users show what a claim is supported by, who confirmed it, what remains unverified, and what the claim does not prove.

Synerxus does not make claims bigger. It makes the evidence behind claims clearer.
