-- Seed content for drill_scenarios. Dev/demo data only — inserted directly
-- since seeding through POST /v1/admin/drills/scenarios requires a Google
-- Workspace admin account that doesn't exist in this local environment.
-- Matches CreateScenarioDto exactly: options need >= 3 entries, each with
-- {id, text, kind, explanation}, kind one of CORRECT/PLAUSIBLE/DANGEROUS/PASSIVE.

INSERT INTO drill_scenarios (title, category, difficulty, prompt, options, points, active) VALUES

('First on scene at a collision', 'RTA', 'BASIC',
 'You arrive at a road accident. Two cars have collided and one driver is trapped but conscious and talking. Traffic is still moving nearby. What is your FIRST priority?',
 '[
   {"id":"a","text":"Move bystanders to safety and place a warning sign or hazard triangle before approaching the vehicles","kind":"CORRECT","explanation":"Securing the scene first prevents a second collision from injuring you, the victims, or other bystanders — that always comes before treating anyone."},
   {"id":"b","text":"Immediately pull the trapped driver out of the vehicle","kind":"DANGEROUS","explanation":"Pulling a trapped person out can worsen spinal or internal injuries. Only move someone immediately if there is a fire or other lethal danger."},
   {"id":"c","text":"Call the trapped driver''s family first","kind":"PLAUSIBLE","explanation":"Notifying family matters eventually, but it does nothing to protect the scene or the victim right now."},
   {"id":"d","text":"Wait in your car until the police arrive","kind":"PASSIVE","explanation":"Doing nothing leaves an unsecured, dangerous scene — bystanders nearby are still at risk from passing traffic."}
 ]'::jsonb, 30, true),

('Motorcyclist down with helmet on', 'RTA', 'MEDIUM',
 'A motorcyclist has crashed and is lying still on the road, helmet still on. He is breathing normally. What should you do about the helmet?',
 '[
   {"id":"a","text":"Leave the helmet on unless it is blocking his airway or breathing, and wait for trained help","kind":"CORRECT","explanation":"Removing a helmet incorrectly can worsen an undetected neck injury. It should only come off if it is actively blocking the airway."},
   {"id":"b","text":"Remove the helmet immediately so he can breathe better","kind":"DANGEROUS","explanation":"He is already breathing normally — removing the helmet adds unnecessary movement risk to a possible neck injury."},
   {"id":"c","text":"Loosen the chin strap only, then wait for emergency services","kind":"PLAUSIBLE","explanation":"Reasonable and low-risk, but not the priority action — his breathing is already fine, so the helmet doesn''t need touching at all yet."},
   {"id":"d","text":"Ignore the helmet and just call for help","kind":"PASSIVE","explanation":"Calling for help is right, but you should still monitor his breathing in case it changes."}
 ]'::jsonb, 50, true),

('Sudden collapse in a market', 'MEDICAL_COLLAPSE', 'BASIC',
 'A man suddenly collapses in a busy market and is unresponsive. A crowd is gathering. What is the correct first step?',
 '[
   {"id":"a","text":"Check responsiveness and breathing, call for emergency help immediately, and start CPR if trained and he is not breathing normally","kind":"CORRECT","explanation":"Confirming responsiveness and breathing tells you what kind of help is needed, and getting emergency services moving early saves critical time."},
   {"id":"b","text":"Give him water to drink","kind":"DANGEROUS","explanation":"An unresponsive person can choke on fluids since they cannot protect their own airway."},
   {"id":"c","text":"Sit him upright against a wall and fan him","kind":"PLAUSIBLE","explanation":"This might help if he were just faint, but for a full collapse it delays checking for breathing and calling for real help."},
   {"id":"d","text":"Wait for someone else in the crowd to act","kind":"PASSIVE","explanation":"In large crowds, everyone often assumes someone else is handling it and nobody does — acting decisively yourself is what actually helps."}
 ]'::jsonb, 30, true),

('Colleague showing signs of a diabetic emergency', 'MEDICAL_COLLAPSE', 'ADVANCED',
 'A diabetic colleague becomes confused, shaky, and sweaty at work. She is conscious and able to swallow safely. What should you do?',
 '[
   {"id":"a","text":"Give her a fast-acting sugar source like juice or glucose tablets, and stay with her while help is called","kind":"CORRECT","explanation":"These are classic signs of low blood sugar. Fast sugar can reverse it quickly, and staying with her lets you watch for it getting worse."},
   {"id":"b","text":"Give her insulin from her bag","kind":"DANGEROUS","explanation":"If this is low blood sugar, insulin would lower it further and could be seriously harmful — never give someone else''s medication without being certain."},
   {"id":"c","text":"Let her rest quietly alone until she feels better","kind":"PLAUSIBLE","explanation":"Rest isn''t harmful, but leaving her alone means nobody notices if her condition worsens."},
   {"id":"d","text":"Assume she is just tired and go back to work","kind":"PASSIVE","explanation":"Dismissing clear symptoms risks the situation escalating to a full loss of consciousness."}
 ]'::jsonb, 80, true),

('Cooking oil fire in the kitchen', 'FIRE', 'BASIC',
 'A small kitchen fire has started from cooking oil. What is the safest way to respond?',
 '[
   {"id":"a","text":"Turn off the heat source and smother the flames with a lid or damp cloth","kind":"CORRECT","explanation":"Cutting off oxygen safely extinguishes an oil fire without spreading it."},
   {"id":"b","text":"Pour water on the burning oil","kind":"DANGEROUS","explanation":"Water on burning oil causes it to explode into a fireball, spraying burning oil outward."},
   {"id":"c","text":"Try to carry the burning pot outside","kind":"PLAUSIBLE","explanation":"Moving a burning pot risks spilling flaming oil on yourself or a path through the building."},
   {"id":"d","text":"Leave it and hope it burns out","kind":"PASSIVE","explanation":"An unattended oil fire can quickly spread to cabinets and the rest of the kitchen."}
 ]'::jsonb, 30, true),

('Guiding people out through smoke', 'FIRE', 'MEDIUM',
 'Smoke is filling a building and you need to help others evacuate. What is the safest way to move through it?',
 '[
   {"id":"a","text":"Stay low to the ground where the air is clearer and guide others to the nearest safe exit","kind":"CORRECT","explanation":"Smoke and heat rise, so the air near the floor is cooler and has more oxygen — staying low is the single most important survival technique in smoke."},
   {"id":"b","text":"Stand upright and run through the thickest smoke to save time","kind":"DANGEROUS","explanation":"Standing upright in thick smoke means breathing the most toxic, hottest air, which can cause disorientation or loss of consciousness."},
   {"id":"c","text":"Cover your face with a wet cloth and walk normally","kind":"PLAUSIBLE","explanation":"A wet cloth can help filter some smoke, but without staying low you are still breathing the worst of it."},
   {"id":"d","text":"Wait by a window for someone to notice","kind":"PASSIVE","explanation":"Waiting passively wastes critical time you could use to reach a safe exit."}
 ]'::jsonb, 50, true),

('Someone struggling in the water', 'DROWNING', 'BASIC',
 'You see someone struggling in water near a riverbank and you cannot swim well. What should you do?',
 '[
   {"id":"a","text":"Reach or throw something — a rope, stick, or floatation object — instead of entering the water yourself","kind":"CORRECT","explanation":"\"Reach, throw, don''t go\" is the standard rule: a struggling swimmer can pull a rescuer under, so a weak swimmer should never enter the water themselves."},
   {"id":"b","text":"Jump in to physically pull them out","kind":"DANGEROUS","explanation":"A panicked, struggling person can easily pull an untrained rescuer under water, creating a second victim."},
   {"id":"c","text":"Shout instructions and wait for a strong swimmer to arrive","kind":"PLAUSIBLE","explanation":"Reasonable, but passive — throwing something they can grab onto immediately is more likely to help in time."},
   {"id":"d","text":"Call for help but do nothing else","kind":"PASSIVE","explanation":"Calling for help is necessary but not sufficient — a floatation aid thrown immediately can make the difference before help arrives."}
 ]'::jsonb, 30, true),

('Child pulled from a pool, breathing faintly', 'DROWNING', 'MEDIUM',
 'A child has been pulled from a pool, is unconscious but breathing faintly. What is the priority while waiting for help?',
 '[
   {"id":"a","text":"Place them in the recovery position on their side and monitor breathing closely","kind":"CORRECT","explanation":"The recovery position keeps the airway clear and lets fluid drain if they vomit, which is common after a near-drowning."},
   {"id":"b","text":"Perform abdominal thrusts to force water out","kind":"DANGEROUS","explanation":"Abdominal thrusts on a drowning victim are not recommended and can delay real care or cause injury — they do not reliably clear water from the lungs."},
   {"id":"c","text":"Keep them lying flat on their back","kind":"PLAUSIBLE","explanation":"Lying flat on the back risks the airway becoming blocked if they vomit, which is common after inhaling water."},
   {"id":"d","text":"Leave them as found and only watch from a distance","kind":"PASSIVE","explanation":"A faintly breathing, unconscious child needs close, active monitoring — their condition can change quickly."}
 ]'::jsonb, 50, true),

('Caught in a pushing crowd', 'CROWD_CRUSH', 'BASIC',
 'You are in a densely packed crowd at an event and people start pushing. What should you do?',
 '[
   {"id":"a","text":"Move diagonally toward the crowd''s edge, keep your arms up near your chest for breathing room, and avoid falling","kind":"CORRECT","explanation":"Moving diagonally (not straight against the flow) is easier, and keeping your arms up protects your chest from compression, the main danger in a crowd crush."},
   {"id":"b","text":"Push back hard against the people pressing on you","kind":"DANGEROUS","explanation":"Pushing back adds to the compressive force in the crowd and increases the risk of someone falling and being trampled."},
   {"id":"c","text":"Try to move straight backward against the crowd''s flow","kind":"PLAUSIBLE","explanation":"Fighting directly against crowd flow is exhausting and often impossible — moving at an angle toward an edge is more effective."},
   {"id":"d","text":"Stand still and wait for the crowd to thin out","kind":"PASSIVE","explanation":"Standing still in a compressing crowd increases your risk of falling once pressure builds further."}
 ]'::jsonb, 30, true),

('Unconscious person, no ID, no bystanders', 'UNKNOWN_VICTIM', 'MEDIUM',
 'You find an unconscious person on the roadside at night with no ID and no bystanders nearby. What is the correct sequence?',
 '[
   {"id":"a","text":"Make sure the scene is safe, check responsiveness and breathing, call for help with your exact location, then stay until help arrives","kind":"CORRECT","explanation":"This sequence — scene safety, assessment, call, stay — protects both you and the victim and ensures responders can actually find them."},
   {"id":"b","text":"Move the person to your car to take them to hospital yourself","kind":"DANGEROUS","explanation":"Moving an unknown-injury victim yourself risks worsening a spinal injury and delays proper emergency response."},
   {"id":"c","text":"Search their pockets first to identify them","kind":"PLAUSIBLE","explanation":"Identification can wait — checking breathing and getting help called is more urgent than knowing their name."},
   {"id":"d","text":"Assume someone else has already reported it and walk away","kind":"PASSIVE","explanation":"This assumption is often wrong and can leave a genuinely unhelped person at serious risk."}
 ]'::jsonb, 50, true),

('Toddler coughing after swallowing something', 'CHILD', 'MEDIUM',
 'A toddler has swallowed something and is coughing forcefully but can still make sound. What should you do?',
 '[
   {"id":"a","text":"Encourage the child to keep coughing, and only intervene if the coughing becomes weak or stops","kind":"CORRECT","explanation":"A forceful cough means the airway isn''t fully blocked — coughing is the body''s most effective way to clear it, and physical intervention is only for a fully blocked airway."},
   {"id":"b","text":"Immediately perform back blows or abdominal thrusts","kind":"DANGEROUS","explanation":"Physical intervention is for a fully blocked airway (no sound, no cough). Doing it on a child who can still cough can push the object further in."},
   {"id":"c","text":"Give the child water to help swallow it down","kind":"PLAUSIBLE","explanation":"Giving fluids while something may be lodged near the airway adds a choking and aspiration risk."},
   {"id":"d","text":"Pick the child up and shake them","kind":"PASSIVE","explanation":"Shaking a child does nothing to help clear an airway and can cause injury."}
 ]'::jsonb, 50, true),

('Crash scene on a dark highway', 'NIGHT', 'ADVANCED',
 'You come across a crash scene on a poorly lit highway at night. Other vehicles are still approaching at speed. What is your first priority?',
 '[
   {"id":"a","text":"Make the scene visible with hazard lights, a warning triangle placed well behind the scene, and a flashlight, before approaching casualties","kind":"CORRECT","explanation":"At night, an unmarked crash scene is invisible to oncoming traffic until it is too late — making the scene visible protects everyone, including you, before anything else."},
   {"id":"b","text":"Rush straight to the injured without securing the scene first","kind":"DANGEROUS","explanation":"Without warning oncoming traffic, you and the injured are at serious risk of being hit by another vehicle."},
   {"id":"c","text":"Call emergency services first, then approach","kind":"PLAUSIBLE","explanation":"Calling for help is important, but it doesn''t protect the scene from oncoming traffic in the minutes before help arrives."},
   {"id":"d","text":"Stay in your car until it is fully light outside","kind":"PASSIVE","explanation":"Waiting for daylight could mean hours of delay for someone who needs help now."}
 ]'::jsonb, 80, true);
