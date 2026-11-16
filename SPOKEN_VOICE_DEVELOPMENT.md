# Roomie Junior spoken-voice development

Prepared on `roomie-voice-development`, based on main `2ac791bd63e2aed98d925b8e61dc11bd0e3d7c67`. Production main is not changed.

- A voice selector and speed controls live in Setup → Look & sound → Sound & voice.
- Three deliberate preview buttons use the same selected voice and speed: greeting, brain break and calm reset. They do not imply three different AI personalities.
- `say` (routine read-aloud) and `speakLine` (brain-break instructions) use the same `roomieSpeak` pipeline and `pickVoice` selector. Their existing independent on/off switches remain.
- Selection saves the actual browser voice URI/name/language, not a guessed gender or provider identity. If unavailable on another device, the saved choice is retained and the UI explains the on-device fallback.
- Browser-declared local/network voices are identified. Automatic fallback selects local voices only; a network voice requires choosing it explicitly. No new TTS provider, API key or microphone is introduced.
- Voice lists refresh on `voiceschanged`, without triggering delayed or surprise speech. Manual refresh and Stop voice are available. Switching voice/rate, leaving settings during a preview and page exit cancel speech. Late callbacks cannot update a different preview or class.
- Speed options are 80%, 95%, 100% and 110%, with bounded legacy values. Existing pitch is bounded without adding a character-voice preset or claiming a realistic voice can be made merely by altering pitch.

`app/spoken-voice-source.js` is the maintained source; its exact code is embedded in the single-file app. Nine added tests cover selection, asynchronous list loading, shared playback, fallback, cancellation, setting bounds and escaped metadata. Existing release checks passed with one existing skip.

A separate private voice-audition Site uses this exact speaker module, isolated browser storage and sample text only. Voices must be auditioned on the intended classroom computer. Premium AI/recorded voice production is not connected or purchased.
