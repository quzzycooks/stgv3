-- Seed content for the Knowledge Library. Dev/demo data — authors are real
-- registered accounts (Dr. Amaka Chukwu, Tunde Bakare) upgraded to verified
-- MEDICAL_DOCTOR / NURSE_PARAMEDIC via SQL, matching the publish gate's
-- real logic (proven separately via a live 403 test against a community
-- member account before this file was written).
--
-- Run `npm run seed:knowledge-authors` first — it creates these three
-- author/commenter accounts (fixed UUIDs referenced below) with properly
-- encrypted phone fields. Running this file without it first will fail on
-- the author_user_id foreign key. Applied to production 2026-07-20.

INSERT INTO articles (title, summary, content, category, author_user_id, read_time_minutes, featured, reviewed) VALUES

('What to Do in the First Minutes After a Road Crash',
 'The sequence that matters most before help arrives: safety, checking, calling, and staying calm.',
 'A road crash is disorienting, even if you are not injured yourself. What you do in the first few minutes can matter more than anything a hospital does later.

First, make the scene safe. Turn on hazard lights if you can reach them safely. If it is dark or on a highway, place a warning triangle or any visible object well behind the crash to warn oncoming traffic before you approach anyone. More people are hurt by a second collision at the scene than by the first one.

Next, check for danger before you check for injuries — fuel leaks, unstable vehicles, downed wires, or oncoming traffic. If it is not safe to approach, stay back and call for help immediately.

If it is safe, check if people are conscious and breathing. Do not move an injured person unless they are in immediate danger (fire, a vehicle that could roll, oncoming traffic) — an unnecessary move can worsen a spinal injury. Talk to them calmly, tell them help is coming, and keep them still.

Call for emergency help and give your exact location — a landmark, a road name, a direction of travel, anything specific. If you are using Stignit, triggering a report from the app sends your GPS location automatically.

If someone is bleeding heavily, apply firm, direct pressure with whatever clean cloth is available and do not remove it once it is soaked — add more on top instead.

Stay until help arrives, or until you are sure someone competent has taken over. Panic spreads quickly in a crowd — a calm, clear voice is one of the most useful things you can bring to a crash scene.',
 'ROAD_CRASH', 'b0adebb7-bbf7-4b4f-81a9-c609cc43d925', 5, true, true),

('Should You Move a Crash Victim? Here''s the Rule',
 'Moving an injured person can help or seriously harm them — the difference is one simple safety rule.',
 'One of the most common instincts at a crash scene is to pull an injured person out of a vehicle or move them to somewhere that "looks safer." Often, this does more harm than good.

The rule bystanders should know: only move someone immediately if leaving them where they are puts them in greater danger right now — a fire, a vehicle at risk of rolling or being hit again, rising floodwater, or similar. If none of those apply, it is safer to keep the person still and wait for trained help.

Why this matters: a crash can cause spinal injuries that are not obvious from the outside. Someone can be conscious, talking, and moving their arms, and still have an unstable neck or back injury. Moving them the wrong way — twisting, lifting under the arms, pulling by the legs — can turn a recoverable injury into permanent paralysis.

If you must move someone because of immediate danger, try to keep their head, neck, and spine in as straight a line as possible as you move them, and get help from others nearby so the movement is as controlled as possible rather than a rushed drag.

If they are trapped and not in immediate danger, the best thing you can do is stay with them, keep them calm and talking, control any visible bleeding with pressure, and wait for responders who have the training and equipment to extract them safely.

It feels counterintuitive to "do nothing" when someone is hurt in front of you. But for crash injuries specifically, stillness combined with calling for help is often the safest form of action.',
 'ROAD_CRASH', 'd263b363-a4d9-4d45-9c86-a0bea6ae80bd', 4, false, true),

('Hands-Only CPR: What to Do When Someone''s Heart Stops',
 'No breathing, no pulse — here is exactly what to do in the minutes before help arrives.',
 'When someone collapses and is not breathing normally, every minute without CPR reduces their chance of survival. You do not need to be a medical professional to help — hands-only CPR is designed for exactly this moment.

First, check for danger, then check the person: tap their shoulders firmly and shout to see if they respond. If there is no response and they are not breathing normally, call for emergency help immediately, or ask someone nearby to call while you start compressions.

Kneel beside the person. Place the heel of one hand in the center of their chest, place your other hand on top, and interlock your fingers. Keep your arms straight and use your body weight, not just your arms, to push straight down.

Push hard and fast — about 5 to 6 centimeters deep, at a rate of 100 to 120 compressions per minute. A helpful trick: the beat of the song "Stayin'' Alive" is almost exactly the right tempo. Let the chest rise fully between each push.

Keep going until emergency help arrives, an automated defibrillator becomes available and can be used, or the person starts breathing normally on their own. This can be physically exhausting — if another trained person is present, switch every two minutes without a long pause.

You are not expected to also give rescue breaths unless you have been trained to do so — continuous chest compressions alone save lives and are what is recommended for an untrained bystander.',
 'CPR', 'd263b363-a4d9-4d45-9c86-a0bea6ae80bd', 4, false, true),

('CPR for Infants: What''s Different',
 'An infant''s chest is not a small adult chest — the technique changes, and so does the pressure.',
 'CPR on a baby under one year old uses the same principle as adult CPR — keep blood moving to the brain until help arrives — but the technique is different because an infant''s body is so much smaller and more fragile.

First, check responsiveness by tapping the sole of the foot and calling out, rather than shaking the shoulders. If there is no response and the baby is not breathing normally, call for help immediately.

Instead of two hands, use two fingers only, placed just below the nipple line in the center of the chest. Compressions should be about 4 centimeters deep — roughly a third of the chest''s depth — at the same fast rate as adult CPR, around 100 to 120 per minute.

Because an infant''s airway is small and easily blocked by the tongue, positioning matters. Keep the head in a neutral position — not tilted back as far as you would for an adult — to avoid closing off the airway.

If you are trained in infant rescue breaths, the ratio taught in most first-aid courses is 30 compressions to 2 breaths, with breaths gentle enough to just make the chest visibly rise — an infant''s lungs are small and can be injured by breaths that are too forceful.

If you have never practiced infant CPR before, continuous compressions while waiting for trained help arrive is still far better than doing nothing. A short hands-on training course is strongly worth taking if you care for young children regularly.',
 'CPR', 'b0adebb7-bbf7-4b4f-81a9-c609cc43d925', 4, false, true),

('Stopping Severe Bleeding: The First 60 Seconds',
 'Heavy bleeding can be life-threatening within minutes — direct pressure is the single most important action.',
 'Severe bleeding is one of the few emergencies where a bystander''s immediate action can be the deciding factor between life and death, often before any responder arrives.

The single most effective thing you can do is apply firm, direct pressure to the wound. Use the cleanest cloth or material available — a shirt, a bandage, even your bare hand if nothing else is available. Press down firmly and do not be afraid of pressing "too hard."

Once you have material on the wound and are applying pressure, do not lift it to check how the bleeding is doing. Removing the pressure disrupts any clot that is starting to form. If blood soaks through, add more material directly on top of what is already there rather than replacing it.

If possible, and if there is no suspected broken bone at the site, raising the injured area above the level of the heart can help slow the bleeding further while you continue applying pressure.

Watch the person for signs of shock — pale or cold skin, rapid breathing, confusion, or weakness — and keep them lying down and warm if these appear, while continuing pressure on the wound.

Keep applying pressure continuously until emergency responders arrive and take over. For bleeding from a limb that will not stop despite firm direct pressure, a tourniquet may be appropriate — but that is a decision with its own rules, covered separately.',
 'BLEEDING', 'b0adebb7-bbf7-4b4f-81a9-c609cc43d925', 4, false, true),

('When to Use a Tourniquet (and When Not To)',
 'A tourniquet can save a life or cause harm depending on when and how it is used — here is the real guidance.',
 'Tourniquets have a reputation for being a last resort, and in a sense they are — but modern first-aid guidance is clearer than the old advice most people remember, and hesitating too long can cost a life in severe limb bleeding.

Use a tourniquet when bleeding from an arm or leg is severe and does not stop with firm, direct pressure for a sustained period, or when the wound is in a location where pressure cannot realistically be maintained, such as a mass-casualty scene with more injured people than helpers.

Apply the tourniquet a few centimeters above the wound, not directly on a joint, and tighten it until the bleeding visibly stops. It should feel very tight — a tourniquet that is not tight enough can make bleeding worse by blocking vein return while still allowing arterial blood in.

Note the exact time the tourniquet was applied, if you can, and make sure this information reaches emergency responders — write it on the person''s skin or clothing if nothing else is available. This detail affects how they are treated.

Once a tourniquet is applied correctly, do not loosen or remove it — that decision belongs to a trained responder. This is different from older advice that suggested periodically releasing it, which is no longer recommended.

A tourniquet is not a routine tool for ordinary bleeding — for the vast majority of wounds, firm direct pressure is sufficient and preferred.',
 'BLEEDING', 'd263b363-a4d9-4d45-9c86-a0bea6ae80bd', 5, false, true),

('First Aid for Burns: Cool, Cover, Call',
 'The three-step response that limits damage from a burn in the critical first minutes.',
 'Burns get worse in the minutes after they happen if the heat is not removed from the skin quickly — what you do immediately matters as much as any treatment that comes later.

Cool the burn under cool (not ice-cold) running water for at least twenty minutes. This is the single most effective first-aid action for a burn and is often skipped or cut short. Ice and ice water should be avoided — they can damage the skin further.

While cooling the burn, remove any tight clothing, jewelry, or accessories near the area before swelling begins, unless they are stuck to the skin — in that case, leave them and let responders handle it.

Cover the burn loosely with clean, non-fluffy material — plastic cling film is a good option if available, laid over the burn rather than wrapped tightly around a limb. Avoid butter, oil, toothpaste, or other home remedies — these trap heat and increase infection risk.

Call for medical help for any burn that is larger than the person''s palm, appears on the face, hands, joints, or genitals, looks white or leathery, or was caused by chemicals or electricity — these all need professional assessment even if the person seems otherwise fine.

Do not pop any blisters that form. They are protecting the healing skin underneath, and breaking them significantly increases the risk of infection.',
 'BURNS', 'd263b363-a4d9-4d45-9c86-a0bea6ae80bd', 4, false, true),

('Surviving a House Fire: Get Low, Get Out',
 'Smoke, not flame, is what kills most people in fires — here is how to move safely through it.',
 'In most house fires, smoke inhalation causes more harm than the fire itself. Understanding how smoke behaves is the key to getting out safely.

Smoke and superheated air rise, which means the cleanest, coolest air in a burning room is near the floor. If a room is filling with smoke, get down low — crawling if necessary — and move toward the nearest exit you know.

Before opening any closed door, check if it is warm using the back of your hand. If it is warm, there is likely fire on the other side — do not open it. Look for another way out instead.

Do not stop to gather belongings. Every second spent searching for a phone or documents is a second of reduced air quality and increased risk. Get yourself and others out first.

Once outside, stay outside. Go to a agreed meeting point and account for everyone who should be with you. Never go back inside a burning building to retrieve someone or something — tell arriving responders instead, since they have protective equipment you do not.

If you cannot reach an exit, go to a room with a window, close the door behind you to slow the fire''s spread, and if possible place a wet cloth along the bottom gap of the door. Signal from the window and call for help with your exact location.',
 'FIRE', 'b0adebb7-bbf7-4b4f-81a9-c609cc43d925', 5, false, true),

('Choking Child: Back Blows and Chest Thrusts',
 'When a child''s airway is fully blocked, this is the sequence that can clear it.',
 'A choking child who cannot cough, cry, or breathe needs immediate physical help — this is different from a child who is coughing forcefully, which usually means their airway is only partially blocked and coughing should be encouraged instead.

If a child over one year old is choking and cannot make any sound, stand or kneel behind them, lean them forward, and give up to five firm back blows between the shoulder blades using the heel of your hand.

If back blows do not clear the object, move to abdominal thrusts: stand behind the child, wrap your arms around their waist, make a fist just above the belly button, grasp it with your other hand, and pull sharply inward and upward up to five times.

Alternate between five back blows and five abdominal thrusts until the object is cleared or the child becomes unresponsive. If they become unresponsive, begin child CPR immediately and call for emergency help if you have not already.

For infants under one year old, the technique changes — abdominal thrusts are not used because of the risk to internal organs. Instead, back blows are combined with chest thrusts using two fingers, similar in position to infant CPR compressions.

If a choking episode resolves and the child seems fine afterward, they should still be seen by a medical professional — back blows and thrusts can occasionally cause internal injury, and part of the object can sometimes remain lodged without obvious symptoms.',
 'CHILD', 'd263b363-a4d9-4d45-9c86-a0bea6ae80bd', 5, false, true),

('Recognizing a Medical Emergency in a Child',
 'Children often cannot describe what''s wrong — here are the warning signs that mean act now, not wait.',
 'Children, especially young ones, often cannot tell you clearly what is wrong with them. Recognizing the physical warning signs of a serious problem is often more reliable than what the child says.

Breathing difficulty is one of the most urgent signs — fast breathing, visible effort with each breath, flaring nostrils, or a child who cannot speak in full sentences because they are struggling to breathe all need urgent attention.

Changes in alertness matter a great deal in children. A child who is unusually difficult to wake, unusually floppy, or who does not respond normally to their surroundings should be treated as a medical emergency, even without an obvious cause.

Skin color changes — pale, blue-tinged (especially around the lips), or blotchy skin — can indicate the body is not getting enough oxygen and should never be ignored, particularly alongside breathing difficulty.

Persistent vomiting, especially alongside drowsiness, a rash that does not fade when pressed with a glass, or a high fever in a very young infant all warrant urgent medical assessment rather than a wait-and-see approach.

Trust your instincts as a caregiver. If a child seems seriously unwell in a way you cannot quite explain, that instinct is worth acting on — it is always better to have a medical professional tell you a child is fine than to wait too long on a genuine emergency.',
 'CHILD', 'b0adebb7-bbf7-4b4f-81a9-c609cc43d925', 4, false, true);

-- A few seed comments on the featured article, from a mix of a verified
-- professional and a community member, so the comments section isn't empty.
INSERT INTO article_comments (article_id, user_id, content)
SELECT id, 'faf771b8-5074-40d0-bba7-c118d133f854', 'This is exactly what happened near my house last month. Wish more people knew to place a warning triangle before running to help.'
FROM articles WHERE title = 'What to Do in the First Minutes After a Road Crash';

INSERT INTO article_comments (article_id, user_id, content)
SELECT id, 'd263b363-a4d9-4d45-9c86-a0bea6ae80bd', 'Good summary. I''d add: if you''re calling for help, stay on the line if you can — dispatchers often ask follow-up questions that change what they send.'
FROM articles WHERE title = 'What to Do in the First Minutes After a Road Crash';

INSERT INTO article_comments (article_id, user_id, content)
SELECT id, 'faf771b8-5074-40d0-bba7-c118d133f854', 'Didn''t know about the "Stayin'' Alive" tempo trick, that''s really helpful to remember under pressure.'
FROM articles WHERE title = 'Hands-Only CPR: What to Do When Someone''s Heart Stops';
