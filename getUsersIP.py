import json
import requests
import os


# --- New: Public IP geolocation helper and tool ---
_ip_loc_cache: dict | None = None

def _fetch_public_ip(timeout: float = 4.0) -> str:
    """Get the machine's public IP via ipify. Returns '' if unavailable."""
    try:
        # IPv6-compatible endpoint; falls back gracefully
        r = requests.get("https://api64.ipify.org", params={"format": "json"}, timeout=timeout)
        r.raise_for_status()
        ip = r.json().get("ip", "")
        return ip or ""
    except Exception:
        try:
            r = requests.get("https://api.ipify.org", params={"format": "json"}, timeout=timeout)
            r.raise_for_status()
            return r.json().get("ip", "") or ""
        except Exception:
            return ""

def get_user_ip_location_data(timeout: float = 4.0) -> dict:
    """
    Detect the public IP and return coarse geolocation.
    Uses ipify to get IP, then ipinfo (if IPINFO_TOKEN is set) or ipapi.co as fallback.
    Returns a dict with fields: ip, city, region, country, latitude, longitude, timezone, org, asn, source.
    """
    global _ip_loc_cache
    if _ip_loc_cache:
        return _ip_loc_cache

    # Optional override for testing
    override_ip = os.getenv("USER_PUBLIC_IP", "").strip()

    ip = override_ip or _fetch_public_ip(timeout=timeout)
    if not ip:
        data = {"error": "Unable to determine public IP."}
        _ip_loc_cache = data
        return data

    # Try ipinfo.io if token provided
    ipinfo_token = os.getenv("IPINFO_TOKEN", "").strip()
    if ipinfo_token:
        try:
            r = requests.get(f"https://ipinfo.io/{ip}", params={"token": ipinfo_token}, timeout=timeout)
            if r.ok:
                j = r.json()
                lat, lon = (None, None)
                if isinstance(j.get("loc"), str) and "," in j["loc"]:
                    parts = j["loc"].split(",", 1)
                    lat = float(parts[0]) if parts[0] else None
                    lon = float(parts[1]) if parts[1] else None
                data = {
                    "ip": j.get("ip") or ip,
                    "city": j.get("city"),
                    "region": j.get("region"),
                    "country": j.get("country"),
                    "latitude": lat,
                    "longitude": lon,
                    "timezone": j.get("timezone"),
                    "org": j.get("org"),
                    "asn": j.get("asn") or (j.get("org") or "").split(" ")[0] if j.get("org") else None,
                    "source": "ipinfo.io"
                }
                _ip_loc_cache = data
                return data
        except Exception:
            pass

    # Fallback: ipapi.co (no key needed, free rate limits)
    try:
        # If override_ip is empty, ipapi can auto-detect with /json/
        url = f"https://ipapi.co/{ip}/json/" if ip else "https://ipapi.co/json/"
        r = requests.get(url, timeout=timeout)
        if r.ok:
            j = r.json()
            data = {
                "city": j.get("city"),
                "region": j.get("region"),
                "country": j.get("country_name") or j.get("country"),
                "timezone": j.get("timezone"),
            }
            _ip_loc_cache = data
            return data
    except Exception:
        pass

    data = {"ip": ip, "error": "Geo lookup failed."}
    _ip_loc_cache = data
    return data



