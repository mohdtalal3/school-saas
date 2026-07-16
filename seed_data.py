#!/usr/bin/env python3
"""
Seed random data into Supabase for testing.
Creates: 8 classes, 20 employees, 150 students with fee/discount/balance data.
Requires: pip install supabase
"""

import random
import os
from datetime import date, timedelta
from supabase import create_client

# ── Config ────────────────────────────────────────────────────────────────────
SUPABASE_URL = "https://itjffasdasfasvgszlvmzkpzbysfafasdadh.supabase.co"
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

# You must set this to your actual school_id from the schools table
SCHOOL_ID = os.environ.get("SCHOOL_ID", "")

sb = create_client(SUPABASE_URL, SUPABASE_KEY)

# ── Data pools ────────────────────────────────────────────────────────────────
FIRST_NAMES = [
    "Ahmed", "Bilal", "Hamza", "Usman", "Ali", "Hassan", "Hussain", "Omar",
    "Fatima", "Ayesha", "Zainab", "Maryam", "Hira", "Sana", "Aisha", "Noor",
    "Abdullah", "Ibrahim", "Yusuf", "Ismail", "Bakr", "Saad", "Asad", "Fahad",
    "Komal", "Saba", "Rabia", "Amna", "Iqra", "Mahnoor", "Laiba", "Eman",
    "Tariq", "Junaid", "Waqar", "Nadeem", "Zeeshan", "Kashif", "Imran", "Aslam",
    "Sadia", "Nimra", "Hira", "Fizza", "Areeba", "Tooba", "Zoha", "Malaika",
]

LAST_NAMES = [
    "Khan", "Ahmed", "Malik", "Sheikh", "Qureshi", "Butt", "Chaudhry", "Raza",
    "Abbasi", "Jutt", "Awan", "Gujjar", "Mughal", "Siddiqui", "Hashmi", "Rana",
    "Bhatti", "Khokhar", "Cheema", "Tarar", "Gilani", "Gardezi", "Shah", "Mehmood",
]

FATHER_PROFESSIONS = [
    "Teacher", "Doctor", "Engineer", "Shopkeeper", "Driver", "Carpenter",
    "Electrician", "Farmer", "Businessman", "Clerk", "Mechanic", "Tailor",
    "Government Employee", "Police Officer", "Accountant", "Builder",
]

BLOOD_GROUPS = ["A+", "B+", "O+", "AB+", "A-", "B-", "O-", "AB-"]
RELIGIONS = ["Islam"]
GENDERS = ["male", "female"]
ROLES = ["Teacher", "Senior Teacher", "Junior Teacher", "Admin Clerk", "Accountant", "Librarian", "Lab Assistant", "PE Instructor"]

CLASS_NAMES = [
    "Play Group", "Nursery", "Prep", "Class 1", "Class 2", "Class 3",
    "Class 4", "Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10",
]

# ── Helpers ───────────────────────────────────────────────────────────────────

def random_phone():
    return f"03{random.choice(['00','01','21','22','23','31','32','33','34','35','36','37','38','39'])}{random.randint(1000000, 9999999)}"

def random_cnic():
    return f"{random.randint(10000, 99999)}-{random.randint(1000000, 9999999)}-{random.choice([1,3,5,7,9])}"

def random_date(start_year=2018, end_year=2024):
    start = date(start_year, 1, 1)
    end = date(end_year, 12, 31)
    delta = end - start
    random_days = random.randint(0, delta.days)
    return (start + timedelta(days=random_days)).isoformat()

def random_dob(min_age=4, max_age=18):
    today = date.today()
    min_d = today.replace(year=today.year - max_age)
    max_d = today.replace(year=today.year - min_age)
    delta = max_d - min_d
    return (min_d + timedelta(days=random.randint(0, delta.days))).isoformat()

# ── Step 1: Create classes ────────────────────────────────────────────────────

def seed_classes(school_id):
    print("Creating classes...")
    classes_to_create = CLASS_NAMES[:8]  # 8 classes
    created = []
    for i, name in enumerate(classes_to_create):
        fee = random.choice([500, 800, 1000, 1200, 1500, 2000, 2500, 3000])
        annual_dues = random.choice([500, 1000, 1500, 2000, 3000])
        capacity = random.choice([30, 40, 50, 60])
        result = sb.table("classes").insert({
            "school_id": school_id,
            "name": name,
            "fee": fee,
            "annual_dues": annual_dues,
            "class_teacher": random.choice(FIRST_NAMES) + " " + random.choice(LAST_NAMES),
            "capacity": capacity,
            "is_active": True,
        }).execute()
        if result.data:
            created.append({"id": result.data[0]["id"], "name": name, "fee": fee, "annual_dues": annual_dues})
            print(f"  ✓ {name} — fee: {fee}, annual_dues: {annual_dues}")
    return created

# ── Step 2: Create employees ──────────────────────────────────────────────────

def seed_employees(school_id, count=20):
    print(f"\nCreating {count} employees...")
    created = []
    for i in range(count):
        name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"
        emp_code = f"EMP-{str(i+1).zfill(4)}"
        login_username = name.lower().replace(" ", ".")
        result = sb.table("employees").insert({
            "school_id": school_id,
            "employee_code": emp_code,
            "name": name,
            "role": random.choice(ROLES),
            "father_husband_name": f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}",
            "gender": random.choice(GENDERS),
            "religion": "Islam",
            "cnic": random_cnic(),
            "date_of_birth": random_dob(25, 55),
            "date_of_joining": random_date(2015, 2024),
            "salary": random.choice([15000, 20000, 25000, 30000, 35000, 40000, 50000, 60000]),
            "experience": f"{random.randint(1, 20)} years",
            "phone": random_phone(),
            "email": f"{login_username}@school.edu.pk",
            "address": f"House {random.randint(1, 200)}, Street {random.randint(1, 50)}, Wah Cantt",
            "education": random.choice(["Matric", "Intermediate", "BA", "BSc", "MA", "MSc", "B.Ed", "M.Ed"]),
            "login_username": login_username,
            "password_hash": None,
            "is_login_active": random.choice([True, False]),
            "is_active": True,
        }).execute()
        if result.data:
            created.append(result.data[0])
    print(f"  ✓ Created {len(created)} employees")
    return created

# ── Step 3: Create students ───────────────────────────────────────────────────

def seed_students(school_id, classes, count=150):
    print(f"\nCreating {count} students...")
    created = []

    # Get current student count for reg no
    existing = sb.table("students").select("id", count="exact").eq("school_id", school_id).limit(1).execute()
    reg_counter = (existing.count or 0) + 1

    for i in range(count):
        cls = random.choice(classes)
        name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"
        gender = random.choice(GENDERS)
        discount = random.choice([0, 0, 0, 0, 100, 200, 300, 500])
        previous_balance = random.choice([0, 0, 0, 0, 500, 1000, 1500, 2000, 3000])
        annual_dues_discount = random.choice([0, 0, 0, 200, 500])
        previous_annual_due = max(0, cls["annual_dues"] - annual_dues_discount)
        is_free = random.choice([False, False, False, False, False, True])  # ~17% free

        result = sb.table("students").insert({
            "school_id": school_id,
            "class_id": cls["id"],
            "registration_no": f"STU-{str(reg_counter).zfill(4)}",
            "name": name,
            "date_of_admission": random_date(2020, 2024),
            "discount": discount,
            "mobile": random_phone(),
            "date_of_birth": random_dob(4, 18),
            "gender": gender,
            "identification_mark": random.choice([None, "Scar on left arm", "Mole on cheek", None, None]),
            "blood_group": random.choice(BLOOD_GROUPS),
            "disease": random.choice([None, None, None, "Asthma", "Diabetes"]),
            "birth_form_id": random_cnic(),
            "additional_note": None,
            "is_orphan": random.choice([False, False, False, False, True]),
            "is_osc": random.choice([False, False, False, False, True]),
            "is_free": is_free,
            "previous_balance": previous_balance,
            "annual_dues_discount": annual_dues_discount,
            "previous_annual_due": previous_annual_due,
            "religion": "Islam",
            "family": random.choice(LAST_NAMES),
            "total_siblings": random.randint(0, 5),
            "address": f"House {random.randint(1, 300)}, Street {random.randint(1, 80)}, Wah Cantt",
            "father_name": f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}",
            "father_nic": random_cnic(),
            "father_profession": random.choice(FATHER_PROFESSIONS),
            "is_active": True,
        }).execute()

        if result.data:
            created.append(result.data[0])
        reg_counter += 1

    print(f"  ✓ Created {len(created)} students")
    return created

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    if not SCHOOL_ID:
        # Try to fetch the first school
        result = sb.table("schools").select("id, name").limit(1).execute()
        if not result.data:
            print("❌ No school found. Set SCHOOL_ID env var or create a school first.")
            return
        SCHOOL_ID_VAL = result.data[0]["id"]
        print(f"Using school: {result.data[0]['name']} ({SCHOOL_ID_VAL})")
    else:
        SCHOOL_ID_VAL = SCHOOL_ID

    print(f"\n🚀 Seeding data for school: {SCHOOL_ID_VAL}\n")

    # Check if classes already exist
    existing_classes = sb.table("classes").select("id, name, fee, annual_dues").eq("school_id", SCHOOL_ID_VAL).execute()
    if existing_classes.data and len(existing_classes.data) > 0:
        print(f"Found {len(existing_classes.data)} existing classes — using them.")
        classes = [{"id": c["id"], "name": c["name"], "fee": c["fee"], "annual_dues": c["annual_dues"]} for c in existing_classes.data]
    else:
        classes = seed_classes(SCHOOL_ID_VAL)

    # Create employees
    seed_employees(SCHOOL_ID_VAL, count=20)

    # Create students
    seed_students(SCHOOL_ID_VAL, classes, count=150)

    print("\n✅ Done! Summary:")
    print(f"   Classes: {len(classes)}")
    print(f"   Employees: 20")
    print(f"   Students: 150")
    print(f"   School ID: {SCHOOL_ID_VAL}")

if __name__ == "__main__":
    main()
