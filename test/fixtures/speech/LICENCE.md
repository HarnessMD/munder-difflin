# Speech fixtures

`librispeech-4446-2275-0024.wav` (16 kHz mono) and `librispeech-4446-2275-0024-48k.wav` (the same audio resampled to 48 kHz) are utterance 4446-2275-0024 from the LibriSpeech ASR corpus, test-clean split (Panayotov, Chen, Povey, Khudanpur, 2015), released under the Creative Commons Attribution 4.0 licence, https://www.openslr.org/12. Reference transcript: "she pressed his hand gently in gratitude". Used by test/v053-md-speech.test.cjs.

`librispeech-7176-92135-0035.wav` (16 kHz mono) is utterance 7176-92135-0035 from the same corpus and split, same licence. Reference transcript: "then lord tuppeny well what about auction". Used by test/transcribe-helper-protocol.test.cjs: without a prompt whisper base.en writes the name "Tapany", with the prompt "Tuppenny" it follows the prompt, which makes a context leak between requests visible.
