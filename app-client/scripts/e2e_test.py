"""
End-to-end API test for the MemoryBridge mobile app flows.
Mirrors exactly what the React Native app calls, in the same order a user would:
  1. signup / login (Bearer tokens)
  2. patients CRUD
  3. persons (known faces) via /patients/:id/persons
  4. recognition endpoints (multipart) — store_known_face, match, known-persons,
     store_unknown_face, suggest-identity
  5. patient session start/exit + verify-caregiver (logout guard)
  6. transcription REST flow: start → transcript-line → finish → conversations
  7. tracking: POST /tracking/locations, GET /tracking/patients/:id/locations
  8. profile endpoints: GET/PATCH /users/me, change-password
"""
import io
import json
import time
import urllib.request
import urllib.error

BASE = "http://localhost:8000"
PASS_COUNT = 0
FAIL_COUNT = 0
FAILURES = []


def req(method, path, body=None, token=None, raw_body=None, headers=None, form=None):
    url = BASE + path
    hdrs = dict(headers or {})
    data = None
    if form is not None:
        boundary = "----e2eboundary9231"
        buf = io.BytesIO()
        for k, v in form.items():
            buf.write(f"--{boundary}\r\n".encode())
            if isinstance(v, tuple):  # file part
                fname, fcontent, ctype = v
                buf.write(
                    f'Content-Disposition: form-data; name="{k}"; filename="{fname}"\r\n'.encode()
                )
                buf.write(f"Content-Type: {ctype}\r\n\r\n".encode())
                buf.write(fcontent)
                buf.write(b"\r\n")
            else:
                buf.write(f'Content-Disposition: form-data; name="{k}"\r\n\r\n'.encode())
                buf.write(str(v).encode())
                buf.write(b"\r\n")
        buf.write(f"--{boundary}--\r\n".encode())
        data = buf.getvalue()
        hdrs["Content-Type"] = f"multipart/form-data; boundary={boundary}"
    elif raw_body is not None:
        data = raw_body
        hdrs.setdefault("Content-Type", "application/octet-stream")
    elif body is not None:
        data = json.dumps(body).encode()
        hdrs["Content-Type"] = "application/json"
    if token:
        hdrs["Authorization"] = f"Bearer {token}"
    r = urllib.request.Request(url, data=data, headers=hdrs, method=method)
    try:
        with urllib.request.urlopen(r, timeout=30) as resp:
            text = resp.read().decode()
            try:
                return resp.status, json.loads(text)
            except Exception:
                return resp.status, text
    except urllib.error.HTTPError as e:
        text = e.read().decode()
        try:
            return e.code, json.loads(text)
        except Exception:
            return e.code, text


def check(name, cond, extra=""):
    global PASS_COUNT, FAIL_COUNT
    if cond:
        PASS_COUNT += 1
        print(f"  PASS {name}")
    else:
        FAIL_COUNT += 1
        FAILURES.append(name)
        print(f"  FAIL {name} {extra}")


def load_fixture(name):
    import os
    path = os.path.join(os.path.dirname(__file__), "fixtures", name)
    with open(path, "rb") as f:
        return f.read()


# ── 1. Auth ────────────────────────────────────────────────────────────────────
print("\n[1] AUTH")
stamp = int(time.time())
email = f"mobile.e2e.{stamp}@test.com"
s, r = req("POST", "/users/signup", {
    "name": "Mobile E2E", "email": email, "password": "Password123",
    "confirm_password": "Password123",
})
check("signup returns 200/201", s in (200, 201), f"got {s}: {r}")

s, r = req("POST", "/users/login", {"email": email, "password": "Password123"})
check("login 200", s == 200, f"got {s}: {r}")
auth = (r.get("data") or {}) if isinstance(r, dict) else {}
TOKEN = auth.get("access_token", "")
REFRESH = auth.get("refresh_token", "")
USER_ID = auth.get("id")
check("login returned access_token", bool(TOKEN))
check("login returned refresh_token", bool(REFRESH))
check("login returned user id", USER_ID is not None)

# refresh
s, r = req("POST", "/users/refresh", {"user_id": USER_ID, "refresh_token": REFRESH})
check("refresh 200", s == 200, f"got {s}: {r}")
if s == 200 and isinstance(r, dict) and r.get("data"):
    TOKEN = r["data"].get("access_token", TOKEN)
    REFRESH = r["data"].get("refresh_token", REFRESH)

s, r = req("GET", "/users/me", token=TOKEN)
check("GET /users/me 200", s == 200, f"got {s}: {r}")
check("me email matches", isinstance(r, dict) and (r.get("data") or {}).get("email") == email)

s, r = req("PATCH", "/users/me", {"name": "Mobile E2E Updated", "age": 40}, token=TOKEN)
check("PATCH /users/me 200", s == 200, f"got {s}: {r}")

# wrong password login
s, r = req("POST", "/users/login", {"email": email, "password": "wrongpass"})
check("login wrong password rejected", s in (400, 401, 403), f"got {s}")

# ── 2. Patients CRUD ───────────────────────────────────────────────────────────
print("\n[2] PATIENTS")
s, r = req("POST", "/patients", {"name": "Test Patient A", "age": 72, "diagnosis_level": "moderate"}, token=TOKEN)
check("create patient 200", s in (200, 201), f"got {s}: {r}")
PATIENT_ID = (r.get("data") or {}).get("id") if isinstance(r, dict) else None
check("patient id returned", PATIENT_ID is not None)

s, r = req("POST", "/patients", {"name": "Test Patient B"}, token=TOKEN)
PATIENT_B = (r.get("data") or {}).get("id") if isinstance(r, dict) else None

s, r = req("GET", "/patients", token=TOKEN)
check("list patients 200", s == 200, f"got {s}")
plist = (r.get("data") or []) if isinstance(r, dict) else []
check("patients list contains created", any(p.get("id") == PATIENT_ID for p in plist))

s, r = req("GET", f"/patients/{PATIENT_ID}", token=TOKEN)
check("get patient 200", s == 200, f"got {s}")
check("patient diagnosis_level moderate", isinstance(r, dict) and (r.get("data") or {}).get("diagnosis_level") == "moderate")

s, r = req("PATCH", f"/patients/{PATIENT_ID}", {"age": 73}, token=TOKEN)
check("update patient 200", s == 200, f"got {s}")
check("patient age updated", isinstance(r, dict) and (r.get("data") or {}).get("age") == 73)

# unauthorized access rejected
s2, r2 = req("GET", f"/patients/{PATIENT_ID}")
check("patient access without token rejected", s2 in (401, 403), f"got {s2}")

# ── 3. Persons via patient endpoints ───────────────────────────────────────────
print("\n[3] PERSONS")
s, r = req("POST", f"/patients/{PATIENT_ID}/persons",
           {"name": "Rahul Singh", "relation": "Son", "is_known": True, "is_family": True,
            "family_member_email": "rahul@test.com"}, token=TOKEN)
check("create person 200", s in (200, 201), f"got {s}: {r}")
PERSON_ID = (r.get("data") or {}).get("id") if isinstance(r, dict) else None

s, r = req("GET", f"/patients/{PATIENT_ID}/persons", token=TOKEN)
check("list persons 200", s == 200, f"got {s}")
persons = (r.get("data") or []) if isinstance(r, dict) else []
check("persons contains created", any(p.get("id") == PERSON_ID for p in persons))

s, r = req("PATCH", f"/patients/{PATIENT_ID}/persons/{PERSON_ID}",
           {"relation": "Son & Caregiver"}, token=TOKEN)
check("update person 200", s == 200, f"got {s}")

# ── 4. Recognition endpoints (multipart) ──────────────────────────────────────
print("\n[4] RECOGNITION")
face_a = load_fixture("face_a.jpg")   # known person photo (Priya)
face_b = load_fixture("face_b.jpg")   # different person → unknown
no_face = bytes.fromhex(
    "ffd8ffe000104a46494600010100000100010000ffdb004300080606070605080707070909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c231c1c2837292c30313434341f27393d38323c2e333432ffc0000b080001000101011100ffc4001f0000010501010101010100000000000000000102030405060708090a0bffc400b5100002010303020403050504040000017d01020300041105122131410613516107227114328191a1082342b1c11552d1f02433627282090a161718191a25262728292a3435363738393a434445464748494a535455565758595a636465666768696a737475767778797a838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae1e2e3e4e5e6e7e8e9eaf1f2f3f4f5f6f7f8f9faffda0008010100003f00fb7e8a28a2bfffd9"
)

s, r = req("POST", "/recognition/store_known_face",
           form={"patient_id": PATIENT_ID, "name": "Priya Singh", "relation": "Daughter",
                 "file": ("priya.jpg", face_a, "image/jpeg")}, token=TOKEN)
check("store_known_face 200", s == 200, f"got {s}: {r}")
store_data = (r.get("data") or {}) if isinstance(r, dict) else {}
check("store_known_face returns person_id", "person_id" in store_data, f"data={store_data}")
check("store_known_face returns embeddings_stored", "embeddings_stored" in store_data)
PRIYA_ID = store_data.get("person_id")

s, r = req("GET", f"/recognition/known-persons/{PATIENT_ID}", token=TOKEN)
check("known-persons 200", s == 200, f"got {s}: {r}")
check("known-persons is list with entries", isinstance(r, dict) and isinstance(r.get("data"), list) and len(r["data"]) >= 1)

s, r = req("POST", f"/recognition/match/{PATIENT_ID}",
           form={"file": ("cap.jpg", face_a, "image/jpeg")}, token=TOKEN)
check("match face 200", s == 200, f"got {s}: {r}")
match_data = (r.get("data") or {}) if isinstance(r, dict) else {}
check("match returns recognised flag", "recognised" in match_data, f"data={match_data}")
check("match recognises Priya (known face)",
      match_data.get("recognised") is True and match_data.get("name") == "Priya Singh",
      f"data={match_data}")

s, r = req("POST", f"/recognition/store_unknown_face/{PATIENT_ID}",
           form={"file": ("unk.jpg", face_b, "image/jpeg")}, token=TOKEN)
check("store_unknown_face 200", s == 200, f"got {s}: {r}")
unk = (r.get("data") or {}) if isinstance(r, dict) else {}
UNKNOWN_ID = unk.get("person_id") or unk.get("unknown_face_id")

# match with a faceless image should degrade gracefully to no_face_detected
s, r = req("POST", f"/recognition/match/{PATIENT_ID}",
           form={"file": ("noface.jpg", no_face, "image/jpeg")}, token=TOKEN)
nf_data = (r.get("data") or {}) if isinstance(r, dict) else {}
check("match no-face returns graceful result",
      s == 200 and (nf_data.get("recognised") is False or nf_data.get("error") == "no_face_detected"),
      f"got {s}: {r}")

# suggest identity on the unknown face (patient-mode flow)
if UNKNOWN_ID:
    s, r = req("POST", f"/recognition/suggest-identity/{UNKNOWN_ID}",
               {"suggested_name": "Uncle Raj", "suggested_relation": "Brother"}, token=TOKEN)
    check("suggest-identity 200", s == 200, f"got {s}: {r}")
else:
    check("suggest-identity skipped (no unknown id)", False)

# caregiver approves the suggestion (pending_verification flow)
s, r = req("GET", f"/patients/{PATIENT_ID}/persons", token=TOKEN)
persons = (r.get("data") or []) if isinstance(r, dict) else []
pending = [p for p in persons if p.get("pending_verification")]
if pending:
    p = pending[0]
    s, r = req("PATCH", f"/patients/{PATIENT_ID}/persons/{p['id']}", {
        "name": p.get("suggested_name"), "relation": p.get("suggested_relation"),
        "is_known": True, "pending_verification": False,
        "suggested_name": None, "suggested_relation": None,
    }, token=TOKEN)
    check("approve suggestion (updatePerson) 200", s == 200, f"got {s}: {r}")
else:
    check("approve suggestion (no pending found)", False, f"persons={[(p['name'], p['pending_verification']) for p in persons]}")

# ── 5. Patient session + logout guard ─────────────────────────────────────────
print("\n[5] PATIENT SESSION")
s, r = req("POST", f"/auth/patient-session/{PATIENT_ID}", token=TOKEN)
check("start patient session 200", s == 200, f"got {s}: {r}")
sess = (r.get("data") or {}) if isinstance(r, dict) else {}
PTOKEN = sess.get("patient_token", "")
check("session returns patient_token", bool(PTOKEN))
check("session returns patient_name", sess.get("patient_name") == "Test Patient A")
check("session returns diagnosis_level", "diagnosis_level" in sess)

# patient-token works as Bearer for patient-scoped endpoints (mobile uses this)
s, r = req("POST", "/tracking/locations",
           {"patient_id": PATIENT_ID, "latitude": 12.9716, "longitude": 77.5946}, token=PTOKEN)
check("record location with patient token 200", s == 200, f"got {s}: {r}")

# verify-caregiver (logout guard — no auth needed)
s, r = req("POST", "/users/verify-caregiver",
           {"email": email, "password": "Password123", "patient_id": PATIENT_ID})
check("verify-caregiver correct creds 200", s == 200, f"got {s}: {r}")

s, r = req("POST", "/users/verify-caregiver",
           {"email": email, "password": "badpass", "patient_id": PATIENT_ID})
check("verify-caregiver wrong creds rejected", s in (400, 401, 403), f"got {s}")

s, r = req("POST", "/auth/patient-session/exit", token=PTOKEN)
check("exit patient session 200", s == 200, f"got {s}: {r}")

# ── 6. Transcription REST flow ─────────────────────────────────────────────────
print("\n[6] TRANSCRIPTION")
s, r = req("POST", "/transcription/start",
           {"patient_id": PATIENT_ID, "patient_name": "Test Patient A", "person_id": PRIYA_ID},
           token=TOKEN)
check("transcription start 200", s == 200, f"got {s}: {r}")
CONV_ID = (r.get("data") or {}).get("conversation_id") if isinstance(r, dict) else None
check("start returns conversation_id", CONV_ID is not None)

lines = [
    "Hi Papa, how are you feeling today?",
    "I am feeling good beta, a little tired.",
    "Do you remember Ramesh from the park?",
    "Yes, we talked about the garden yesterday.",
]
for line in lines:
    s, r = req("POST", "/transcription/transcript-line",
               {"conversation_id": CONV_ID, "text": line}, token=TOKEN)
    check(f"transcript-line '{line[:24]}…' 200", s == 200, f"got {s}: {r}")

s, r = req("POST", "/transcription/finish",
           {"conversation_id": CONV_ID, "patient_name": "Test Patient A",
            "full_transcript": " ".join(lines)}, token=TOKEN)
check("transcription finish 200", s == 200, f"got {s}: {r}")
summary = (r.get("data") or {}).get("summary") if isinstance(r, dict) else None
check("finish returns summary", bool(summary), f"summary={summary!r}")

s, r = req("GET", f"/transcription/conversations/{PATIENT_ID}", token=TOKEN)
check("get conversations 200", s == 200, f"got {s}")
convs = (r.get("data") or []) if isinstance(r, dict) else []
check("conversations contains finished one", any(c.get("id") == CONV_ID for c in convs))
mine = next((c for c in convs if c.get("id") == CONV_ID), None)
if mine:
    check("conversation has transcripts", len(mine.get("transcripts", [])) >= 4)
    check("conversation has summary", bool(mine.get("summary")))
    check("conversation has person context", mine.get("person") is not None and mine["person"].get("name") == "Priya Singh")

if PRIYA_ID:
    s, r = req("GET", f"/transcription/person/{PRIYA_ID}/conversations", token=TOKEN)
    check("person conversations 200", s == 200, f"got {s}: {r}")
    pdata = (r.get("data") or {}) if isinstance(r, dict) else {}
    check("person conversations returns person info", "person" in pdata)
    check("person conversations history present", len(pdata.get("conversations", [])) >= 1)

# ── 7. Tracking ────────────────────────────────────────────────────────────────
print("\n[7] TRACKING")
for lat, lng in [(12.9722, 77.5931), (12.9731, 77.5920)]:
    s, r = req("POST", "/tracking/locations",
               {"patient_id": PATIENT_ID, "latitude": lat, "longitude": lng}, token=TOKEN)
    check(f"record location ({lat}) 200", s == 200, f"got {s}: {r}")

s, r = req("GET", f"/tracking/patients/{PATIENT_ID}/locations", token=TOKEN)
check("get locations 200", s == 200, f"got {s}")
locs = r if isinstance(r, list) else (r.get("data") or []) if isinstance(r, dict) else []
check("locations list has 3 entries", len(locs) >= 3, f"got {len(locs)}")

# ── 8. Family / delete / change-password / account cleanup ────────────────────
print("\n[8] PROFILE & CLEANUP")
s, r = req("GET", "/users/me", token=TOKEN)
check("me name updated", isinstance(r, dict) and (r.get("data") or {}).get("name") == "Mobile E2E Updated")

s, r = req("PATCH", "/users/me/change-password",
           {"current_password": "Password123", "new_password": "NewPassword123",
            "confirm_new_password": "NewPassword123"}, token=TOKEN)
check("change-password 200", s == 200, f"got {s}: {r}")

s, r = req("POST", "/users/login", {"email": email, "password": "NewPassword123"})
check("login with new password 200", s == 200, f"got {s}: {r}")
if s == 200 and isinstance(r, dict):
    TOKEN = (r.get("data") or {}).get("access_token", TOKEN)

# delete persons & patient for the other test patient
if PATIENT_B:
    s, r = req("DELETE", f"/patients/{PATIENT_B}", token=TOKEN)
    check("delete patient B 200", s in (200, 204), f"got {s}")

s, r = req("DELETE", f"/patients/{PATIENT_ID}/persons/{PERSON_ID}", token=TOKEN)
check("delete person 200", s in (200, 204), f"got {s}")

s, r = req("DELETE", "/users/me", token=TOKEN)
check("delete account 200", s in (200, 204), f"got {s}: {r}")

s, r = req("GET", "/users/me", token=TOKEN)
check("me after delete rejected", s in (401, 403, 404), f"got {s}")

# ── Summary ────────────────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print(f"RESULTS: {PASS_COUNT} passed, {FAIL_COUNT} failed")
if FAILURES:
    print("Failed checks:")
    for f in FAILURES:
        print(f"  - {f}")
print("=" * 60)
