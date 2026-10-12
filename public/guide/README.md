# Guide screenshots

The onboarding guide uses these product screenshots directly from `public/guide`.
WebP is preferred. Crop browser chrome and remove email addresses, user IDs, API keys,
and other personal information.

Current assets:

- `add-vocabulary.webp`: searching for a word and selecting its intended sense.
- `vocabulary-bank.webp`: saved words, learning states, targets, and grammar details.
- `review-session.webp`: a revealed Review card and all four recall choices.
- `activation-feedback.webp`: sentence scores, target-word feedback, and corrections.
- `history.webp`: saved Activation attempts and their overall scores.
- `dashboard-next-action.webp`: the recommended next action and learning progress.

The guide stores every image's real dimensions in `guide-content.tsx`, so replacement images
may use different aspect ratios. Update those dimensions when replacing an asset. Keep important
content away from the image edges and verify that text remains readable inside the guide.
