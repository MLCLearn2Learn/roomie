# Roomie coaching: development only

Branch: `roomie-coaching-development`. Based on production commit `b425d026a9aa0943e01cca6e94969949ed65105e`. Do not merge or deploy until the later coaching release is approved. This work excludes the separate secure-transfer development changes.

## First increment

- Choose modelling, guided practice, discussion, independent work, mixed or unknown context before a lesson; retain it with the report. Older reports default to unknown.
- Replace automatic grading with context-specific reflections. Sound-based speaker estimates are not used as evidence of teaching quality or learning.
- Surface possible response prompts, reasoning prompts and acknowledgements from recognised text, with timestamps and explicit uncertainty.
- Teachers mark a moment as relevant, not relevant or needing checking. Relevance does not confirm the speaker, transcript accuracy or student outcomes.
- Save one teacher-chosen next step and reflection. Progress displays these across lessons without pass/fail targets or habit claims.
- The Claude handoff includes lesson context and uncertainty; no universal aims or teacher/student talk percentages. Recognised text remains untrusted data.

## Validation

Automated coverage includes context-sensitive interpretation, unavailable speech, legacy reports, malformed text entries, escaping, bounded edits, cross-class report isolation, review selection validation and the AI payload. Existing microphone session cancellation and speech privacy tests also run. Transfer V2 suites are excluded because that feature is on a different development track.

No real classroom accuracy study or browser walkthrough of this development UI has been completed. This is an initial coaching foundation, not a release-ready or clinically validated assessment.

## Outstanding before release

1. Test the development UI with synthetic lesson fixtures, including keyboard navigation and smaller screens.
2. Review actual detection errors against human-annotated, appropriately authorised lesson samples. Validate different room acoustics and microphone configurations.
3. Decide whether reliable speaker attribution is achievable; keep unsupported metrics unavailable rather than asserting accuracy.
4. Add transcript correction and full review/redaction before any external AI handoff; currently a teacher can mark relevance but cannot correct the recognised text in this new report.
5. Align all focus descriptions, reference claims and optional slide-analysis feedback with the new evidence model; legacy analysis helpers remain for further review.
6. Complete consent, retention, backup, deletion and speech-service checks with schools before the pilot.
7. Define the controlled pilot and later launch independently of the classroom-management release.

Production `main` remains unchanged by this branch.
