# @playdeck/audio-analysis

A small deterministic bridge from a real audio file to PlayDeck motion pressure.

It shells out to FFmpeg/ffprobe, decodes mono PCM at 8 kHz, separates approximate low/mid/high energy with two simple one-pole low-pass filters, computes RMS buckets, then normalizes each band against its 95th percentile.

This is intentionally **not** musicological section detection.

~~~text
AUDIO ENVELOPE != SONG STRUCTURE
ENERGY BAND != SEMANTIC MEANING
~~~

The composer may still use explicit track gates when available, or its clearly marked duration fallback when they are not.
