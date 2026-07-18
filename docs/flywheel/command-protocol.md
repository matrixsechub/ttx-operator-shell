# Flywheel command protocol

Commands use `CATEGORY::TARGET::PARAMETER`, normalized to uppercase. Targets are `FLYWHEEL` or `STAGE_1` through `STAGE_10`. Unknown categories, targets, parameters, or stage/category combinations fail closed.

- C0: read and analyze.
- C1: scan, pause, lower autonomy, and request evidence.
- C2: synthesis, generation, stage advancement, safe-mode resume, termination, and next-cycle activation.
- C3: scaling workflow changes.
- C6: `DEPLOY`, always denied in v1.

Examples: `ANALYZE::FLYWHEEL::HEALTH`, `SCAN::STAGE_1::LEADS`, `SYNTH::STAGE_1::QUALIFY`, `PAUSE::FLYWHEEL::LOWER_AUTONOMY`, and `LOOP::STAGE_10::NEXT_CYCLE`.

C0/C1 stage analysis produces evidence but does not advance the stage. A material C2+ command is required for transition.
