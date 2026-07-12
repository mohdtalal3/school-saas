-- ============================================================
-- Migration: 0004_rules_and_regulations.sql
-- Purpose:   Add rules & regulations to schools (separate for
--            employees and students) so admins can edit them
--            and they appear on offer letters / contracts.
-- ============================================================

ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS employee_rules TEXT,
  ADD COLUMN IF NOT EXISTS student_rules  TEXT;

-- ── Default rules (only set if column is NULL) ───────────────
-- These are conservative defaults so an admin's first letter
-- isn't empty. Admins can edit them in General Settings.

UPDATE schools
SET employee_rules = '1. The employee shall report to the school premises on time and follow the duty schedule assigned by the administration.

2. The employee is expected to maintain professional conduct with students, parents, and colleagues at all times.

3. Any leave must be applied for in advance and approved by the principal or relevant authority. Unauthorised absence may lead to disciplinary action.

4. The employee shall not engage in any private tuition or activity that conflicts with the interests of the school.

5. Confidential information about students, parents, and school matters must not be disclosed to any third party.

6. The employee must respect and abide by all school policies, rules, and any lawful orders given by the administration.

7. Termination of employment must follow the notice period stipulated in the offer letter, or as required by applicable law.

8. The school reserves the right to amend these rules from time to time; the employee will be notified of any changes.'

WHERE employee_rules IS NULL;

UPDATE schools
SET student_rules = '1. Students must arrive at school on time and attend all scheduled classes, assemblies, and activities.

2. Every student is expected to wear the prescribed school uniform neatly and carry the school ID card at all times.

3. Use of mobile phones, electronic gadgets, and undesirable items inside school premises is strictly prohibited.

4. Students must show respect to teachers, staff, and fellow students. Ragging, bullying, or harassment in any form is a serious offence.

5. Any damage to school property will be the responsibility of the student, and parents will be liable for the cost of repair or replacement.

6. Leave of absence must be applied for in advance through the parent or guardian. Repeated unauthorised absence may result in removal from rolls.

7. Students must abide by all rules of the library, laboratory, computer lab, and sports facilities.

8. The school reserves the right to amend these rules and to take disciplinary action, including suspension or expulsion, for breach of any rule.'

WHERE student_rules IS NULL;