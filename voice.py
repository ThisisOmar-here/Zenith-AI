"""
Voice layer for Zoe — Speech-to-Text (Groq Whisper) + Text-to-Speech (ElevenLabs v3).

STT:  Groq's Whisper Large v3 — already in the tech stack, fast and accurate.
TTS:  ElevenLabs Eleven v3 — context-aware emotion, mode-specific delivery settings.

Usage (from api.py):
    transcript = await transcribe(audio_bytes)
    audio_bytes = await synthesize(text, mode="SUPPORT")
"""
import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# ── ElevenLabs voice settings per operational mode ─────────────────────────
# stability:       higher = more consistent/calm, lower = more expressive
# similarity_boost: voice identity fidelity
# style:           expressiveness / energy level
VOICE_SETTINGS: dict = {
    "SUPPORT": {"stability": 0.75, "similarity_boost": 0.80, "style": 0.25},  # warm, calm
    "CASUAL":  {"stability": 0.50, "similarity_boost": 0.75, "style": 0.60},  # lively, natural
    "ADVICE":  {"stability": 0.65, "similarity_boost": 0.80, "style": 0.40},  # grounded but engaged
    "URGENT":  {"stability": 0.90, "similarity_boost": 0.85, "style": 0.10},  # very steady, grounding
    "ACCOUNTABILITY": {"stability": 0.70, "similarity_boost": 0.80, "style": 0.35},  # direct but warm
}

# Zoe's dedicated ElevenLabs voice ID — set this after creating a custom voice
ZOE_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "EXAVITQu4vr4xnSDxMaL")  # Default: "Sarah" (warm)


async def transcribe(audio_bytes: bytes, filename: str = "audio.webm") -> str:
    """
    Transcribe audio using Groq's Whisper Large v3.
    Returns the transcript string.
    """
    try:
        from groq import Groq
        client = Groq(api_key=os.getenv("GROQ_API_KEY"))

        # Groq expects a file-like object with a name
        import io
        audio_file = io.BytesIO(audio_bytes)
        audio_file.name = filename

        transcription = client.audio.transcriptions.create(
            file=audio_file,
            model="whisper-large-v3",
            language="en",
            response_format="text",
        )
        transcript = str(transcription).strip()
        logger.info("Transcription complete: %d chars", len(transcript))
        return transcript

    except Exception as exc:
        logger.error("Transcription failed: %s", exc)
        raise RuntimeError(f"Transcription failed: {exc}") from exc


async def synthesize(text: str, mode: str = "SUPPORT") -> bytes:
    """
    Synthesize speech using ElevenLabs Eleven v3.
    Returns raw MP3 bytes.
    """
    api_key = os.getenv("ELEVENLABS_API_KEY")
    if not api_key:
        raise RuntimeError("ELEVENLABS_API_KEY not set")

    settings = VOICE_SETTINGS.get(mode.upper(), VOICE_SETTINGS["SUPPORT"])

    try:
        from elevenlabs import ElevenLabs, VoiceSettings
        client = ElevenLabs(api_key=api_key)

        audio_generator = client.text_to_speech.convert(
            text=text,
            voice_id=ZOE_VOICE_ID,
            model_id="eleven_multilingual_v3",
            voice_settings=VoiceSettings(
                stability=settings["stability"],
                similarity_boost=settings["similarity_boost"],
                style=settings["style"],
                use_speaker_boost=True,
            ),
            output_format="mp3_44100_128",
        )

        # Collect generator into bytes
        audio_bytes = b"".join(audio_generator)
        logger.info("Synthesis complete: %d bytes (mode=%s)", len(audio_bytes), mode)
        return audio_bytes

    except Exception as exc:
        logger.error("Synthesis failed: %s", exc)
        raise RuntimeError(f"Synthesis failed: {exc}") from exc


def detect_mode_from_response(response_text: str) -> str:
    """
    Heuristic: infer which operational mode produced this response
    so we can set appropriate TTS delivery.
    (Zoe's actual mode is set in AnswerQes — this is a fallback.)
    """
    lower = response_text.lower()
    crisis_keywords = ["crisis line", "988", "emergency", "call someone", "not alone"]
    if any(k in lower for k in crisis_keywords):
        return "URGENT"
    if "?" in response_text and len(response_text) < 200:
        return "CASUAL"
    return "SUPPORT"
