// FILE: src/pages/PetCare.jsx
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

/* General pet-care and grooming guidance. It is not a substitute for a vet's advice. */

const SPECIES = [
  {
    key: "dog",
    label: "Dogs",
    icon: "🐶",
    intro: "Regular grooming keeps your dog comfortable, and it's the easiest way to spot lumps, skin problems and parasites early.",
    schedule: [
      ["Brushing", "Short coats weekly. Medium and long coats every 1 to 2 days, and daily when shedding."],
      ["Bath", "Every 4 to 6 weeks, or when dirty. Too many baths dry out the skin."],
      ["Ears", "Check weekly. Clean only if they look or smell dirty."],
      ["Nails", "Every 3 to 4 weeks, or when you hear clicking on the floor."],
      ["Teeth", "Brush daily, or at least 3 times a week."],
      ["Fleas and ticks", "Prevention every month all year round, as your vet directs."],
    ],
    steps: [
      ["Brushing", ["Pick the right tool: a slicker brush for long or curly coats, a bristle or rubber brush for short coats.", "Brush in the direction the hair grows. For tangles, work from the ends toward the skin, a little at a time.", "Never pull on a mat. If it's tight against the skin, ask a groomer or vet to remove it.", "Give treats so brushing stays a good experience."]],
      ["Bathing", ["Brush first. Water tightens mats.", "Use lukewarm water and dog shampoo only. Human shampoo can irritate a dog's skin.", "Keep soap and water out of the eyes and ears.", "Rinse until the water runs clear, because leftover shampoo causes itching.", "Dry thoroughly with a towel, then a blow-dryer on cool or low if your dog tolerates it. Damp coats in humid weather lead to skin infections."]],
      ["Trimming nails", ["Use dog nail clippers or a grinder and take off tiny bits at a time.", "On light nails, avoid the pink area inside (the quick). On dark nails, trim small slices until you see a dark dot in the center.", "If you cut too far and it bleeds, press styptic powder or cornstarch on the tip.", "If you're nervous, ask your vet or a groomer to show you the first time."]],
      ["Ears and eyes", ["Healthy ears are pale pink with no strong smell.", "Wipe only the outer ear with a vet-approved cleaner on cotton. Never push cotton swabs into the ear canal.", "Wipe the corners of the eyes with a soft damp cloth.", "See a vet for redness, a bad smell, discharge or a lot of head shaking."]],
      ["Brushing teeth", ["Use dog toothpaste only. Human toothpaste can be harmful to dogs.", "Let your dog lick the toothpaste first, then brush the outer surfaces in small circles.", "Dental chews help, but they don't replace brushing."]],
    ],
    tip: "Don't shave double-coated breeds (such as Pomeranians or huskies). The undercoat helps protect against heat. Brush it out instead.",
    care: [
      "Feed a complete dog food made for your dog's age. Puppies need 3 to 4 small meals a day, adults usually 2. Measure portions and keep fresh water out at all times.",
      "Walk every day. Most adult dogs need 30 to 60 minutes, and active breeds need more. Walk early morning or evening, and check that the pavement isn't too hot for paws.",
      "Use rewards for training. Gentle, early socialization with people, dogs and sounds builds a confident dog.",
      "Ask your vet for a vaccination and deworming schedule, especially for puppies. Rabies vaccination is important in the Philippines.",
      "Spay or neuter, and give your dog an ID tag. A microchip helps if they ever get lost.",
    ],
    kit: ["Brush or comb", "Dog shampoo", "Nail clippers", "Dog toothpaste and brush", "Towels", "Ear cleaner", "Treats"],
  },
  {
    key: "cat",
    label: "Cats",
    icon: "🐱",
    intro: "Cats groom themselves, but they still need help with brushing, nails and teeth, and you need to watch the litter box.",
    schedule: [
      ["Brushing", "Short coats weekly. Long coats daily or every other day."],
      ["Bath", "Rarely. Only if very dirty or if your vet advises it."],
      ["Nails", "Every 2 to 3 weeks."],
      ["Teeth", "Brush several times a week with cat toothpaste."],
      ["Ears and eyes", "Check weekly."],
      ["Litter box", "Scoop daily. Empty and wash it every week or so."],
    ],
    steps: [
      ["Brushing", ["Use a soft brush or a wide-tooth comb for long fur. Keep sessions short and calm.", "Be gentle around the belly, which many cats don't like to have touched.", "Regular brushing reduces hairballs. Ask a groomer to remove mats instead of cutting them yourself."]],
      ["Trimming nails", ["Hold the paw and press gently so the claw extends.", "Trim only the clear tip and stay away from the pink area (the quick).", "Pick a calm moment, such as after a meal, and reward with a treat."]],
      ["Bathing (only when needed)", ["Use cat shampoo and lukewarm water in a quiet room.", "Be quick and gentle, keep water away from the face, and dry with a warm towel.", "Most cats never need a bath. Wiping with a damp cloth is usually enough."]],
      ["Teeth", ["Use cat toothpaste only, never human toothpaste.", "Start by letting your cat lick it, then brush a few teeth at a time.", "Bad breath or drooling can mean dental disease, so see a vet."]],
      ["Ears and eyes", ["Wipe eye crust with a clean damp cotton pad, one pad per eye.", "Dark, crumbly debris in the ears can mean ear mites. A vet can treat it."]],
    ],
    tip: "Never skip the litter box. Cats that suddenly avoid it, or strain with little or no urine, can be seriously ill. See a vet the same day.",
    care: [
      "Feed a complete cat food. Cats often drink too little, so fresh water in several spots and some wet food help their kidneys and bladder.",
      "Provide one litter box per cat plus one extra, kept clean and in a quiet spot.",
      "Give scratching posts so claws and furniture both stay healthy, and play for 10 to 15 minutes, twice a day.",
      "Keep cats indoors or supervised, and put screens on windows and balconies. Lilies are extremely toxic to cats.",
      "Ask your vet about vaccines (including rabies), deworming, flea prevention and spaying or neutering.",
    ],
    kit: ["Soft brush or comb", "Cat nail clippers", "Cat toothpaste", "Cotton pads", "Litter scoop", "Scratching post", "Toys"],
  },
  {
    key: "rabbit",
    label: "Rabbits",
    icon: "🐰",
    intro: "Rabbits are delicate. They overheat easily, hide illness, and should never be bathed in water.",
    schedule: [
      ["Brushing", "Weekly, and daily while molting."],
      ["Bath", "Never. Spot-clean with a damp cloth only."],
      ["Nails", "Every 4 to 6 weeks."],
      ["Teeth", "Check weekly. Unlimited hay keeps them worn down."],
      ["Cage clean", "Spot-clean daily and deep-clean weekly."],
      ["Ears and eyes", "Check weekly."],
    ],
    steps: [
      ["Brushing", ["Use a soft brush and be very gentle. A rabbit's skin tears easily.", "Sit on the floor so a startled rabbit can't fall from a height.", "Swallowed fur can block the gut, so brush more often when your rabbit is molting."]],
      ["Trimming nails", ["Use small-animal nail clippers and trim only the tip, avoiding the pink part.", "Wrapping your rabbit snugly in a towel helps, but never force a struggling rabbit.", "Have a vet show you the first time."]],
      ["Keeping clean without a bath", ["Full baths can cause shock and dangerous stress.", "Use a damp cloth for small spots and dry them well.", "A constantly dirty bottom can point to a diet or health problem, so see a vet."]],
      ["Teeth", ["A rabbit's teeth never stop growing. Unlimited grass hay and chew toys wear them down.", "Drooling, a wet chin, dropping food or eating less can mean dental trouble. See a rabbit-savvy vet."]],
    ],
    tip: "If your rabbit stops eating or pooping for 12 hours or more, treat it as an emergency and see a vet right away.",
    care: [
      "Most of the diet should be unlimited grass hay (80 to 90 percent), plus fresh leafy greens daily and a small amount of rabbit pellets. Fruit is only an occasional treat.",
      "Keep rabbits cool and shaded. Heat is dangerous, and heavy lethargy, a wet nose or fast breathing in hot weather is an emergency.",
      "Give a roomy enclosure with a solid floor, and several hours a day outside it in a rabbit-proofed space.",
      "Rabbits are social, so most do better with company. Spaying or neutering improves health and behavior.",
      "Find a vet who treats rabbits. Not every clinic does.",
    ],
    kit: ["Soft brush", "Small-animal nail clippers", "Grass hay", "Hay feeder", "Heavy water bowl", "Chew toys", "Towel"],
  },
  {
    key: "bird",
    label: "Birds",
    icon: "🐦",
    intro: "Birds hide illness until they're very sick, so daily observation matters more than any grooming routine.",
    schedule: [
      ["Food and water", "Replace fresh every day and wash the dishes."],
      ["Cage liner and perches", "Clean daily. Deep-clean the cage weekly."],
      ["Bathing or misting", "A few times a week, in the morning in a warm room."],
      ["Nails and wings", "Only by an avian vet or an experienced groomer."],
      ["Sleep", "10 to 12 hours in a dark, quiet place."],
      ["Health check", "Look at droppings, feathers, eyes and appetite every day."],
    ],
    steps: [
      ["Bathing and misting", ["Offer a shallow dish of lukewarm water, or gently mist with a clean spray bottle.", "Never force a bird. Let it splash and preen by itself.", "Keep the bird in a warm room away from drafts until it's dry."]],
      ["Nails and wings", ["Don't trim these at home. A wrong cut can bleed badly or injure the bird.", "Ask an avian vet to do it and show you what's needed."]],
      ["Cage hygiene", ["Replace the liner and wipe droppings daily.", "Wash dishes and perches often, and use bird-safe cleaners. Let everything dry fully before putting it back."]],
      ["Daily health check", ["Droppings should look consistent from day to day. A change in color or amount is worth noting.", "A bird that sits fluffed up, eats less or sleeps a lot during the day needs a vet quickly."]],
    ],
    tip: "Fumes can kill birds. Overheated non-stick pans, aerosol sprays, scented candles, air fresheners and cigarette smoke are all dangerous. Keep your bird away from the kitchen.",
    care: [
      "Feed pellets made for your bird plus fresh vegetables. Seeds alone lack nutrients, so keep them as a smaller part of the diet.",
      "Never feed avocado, chocolate, caffeine, alcohol, onion or garlic.",
      "Put the cage in a bright spot with no drafts, and make sure it's big enough for the bird to stretch and flap.",
      "Birds are social. Give daily out-of-cage time, toys and foraging games.",
      "Book a yearly check with an avian vet.",
    ],
    kit: ["Spray bottle or bath dish", "Bird-safe cleaner", "Spare perches", "Pellets and vegetables", "Cage liners", "Toys"],
  },
];

const TOXIC = [
  ["Chocolate and caffeine", "Dogs, cats, birds and rabbits"],
  ["Grapes and raisins", "Dogs"],
  ["Onions, garlic and chives", "Dogs, cats, birds and rabbits"],
  ["Xylitol (in sugar-free gum and some peanut butters)", "Dogs"],
  ["Macadamia nuts", "Dogs"],
  ["Alcohol and raw dough", "All pets"],
  ["Cooked bones, which can splinter", "Dogs and cats"],
  ["Avocado", "Birds and rabbits"],
  ["Lilies", "Cats (very dangerous, even the pollen or vase water)"],
];

const EMERGENCY = [
  "Trouble breathing, or blue or very pale gums",
  "Collapse, seizure or sudden weakness",
  "Heavy bleeding, or injury from a fall or car, even if the pet seems fine",
  "A hard, swollen belly, or retching with nothing coming up",
  "Repeated vomiting or diarrhea, especially with blood or lethargy",
  "Straining to pee with little or no urine, especially in male cats",
  "Heatstroke: heavy panting, drooling, weakness. Cool gradually with room-temperature water on the way",
  "Eating something toxic. Don't wait for symptoms to appear",
  "A rabbit not eating or pooping for 12 hours, or a cat or dog not eating for over a day",
];

const FIRST_WEEK = [
  ["Give them a quiet space", "A calm room with a bed, water and food helps a new pet settle. Don't overwhelm them with visitors."],
  ["Keep food familiar", "Ask the shelter what they were eating and switch to a new food slowly over about a week."],
  ["Set a routine", "Regular meal times, walks and play help pets feel safe."],
  ["Visit the vet early", "Book a health check in the first week and set up vaccinations, deworming and flea prevention."],
  ["Be patient", "Many pets need about three days to decompress, three weeks to learn the routine and three months to feel at home."],
  ["Supervise children", "Teach kids to be gentle, and never leave small children alone with a pet."],
];

const CLIMATE = [
  ["Heat and humidity", "Provide shade and fresh water. Walk in the early morning or evening, and never leave a pet in a parked car, even for a minute."],
  ["Rainy season", "Dry coats completely after baths and rain. Keep dogs away from floodwater, because it can carry leptospirosis. Ask your vet about vaccination."],
  ["Ticks and fleas", "They are active all year in a warm climate, and tick-borne disease is common in dogs. Ask your vet about regular prevention."],
  ["Rabies", "Rabies is present in the Philippines. Keep dogs and cats vaccinated, and ask your city veterinary office about local registration."],
];

export default function PetCare() {
  const navigate = useNavigate();
  const [key, setKey] = useState("dog");
  const tabRefs = useRef({});
  const current = SPECIES.find((s) => s.key === key);

  const onTabKey = (e, i) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = SPECIES[(i + (e.key === "ArrowRight" ? 1 : SPECIES.length - 1)) % SPECIES.length];
    setKey(next.key);
    tabRefs.current[next.key]?.focus();
  };

  return (
    <div className="pc-root">
      <style>{CSS}</style>

      <header className="pc-hero">
        <span className="pc-eyebrow">Pet Care</span>
        <h1>Grooming and care, done right</h1>
        <p>Simple, practical steps to keep your pet clean, healthy and happy, from the first day you bring them home.</p>
        <div className="pc-hero-actions">
          <button type="button" className="pc-btn" onClick={() => navigate("/vets")}>Find a vet</button>
          <button type="button" className="pc-btn pc-ghost" onClick={() => navigate("/adopt")}>Meet adoptable pets</button>
        </div>
      </header>

      <main className="pc-main">
        <div role="tablist" aria-label="Choose your pet" className="pc-tabs">
          {SPECIES.map((s, i) => (
            <button
              key={s.key}
              ref={(el) => (tabRefs.current[s.key] = el)}
              role="tab"
              id={`tab-${s.key}`}
              aria-selected={key === s.key}
              aria-controls={`panel-${s.key}`}
              tabIndex={key === s.key ? 0 : -1}
              className={`pc-tab ${key === s.key ? "on" : ""}`}
              onClick={() => setKey(s.key)}
              onKeyDown={(e) => onTabKey(e, i)}
            >
              <span aria-hidden="true">{s.icon}</span> {s.label}
            </button>
          ))}
        </div>

        <section role="tabpanel" id={`panel-${current.key}`} aria-labelledby={`tab-${current.key}`} className="pc-panel">
          <p className="pc-intro">{current.intro}</p>

          <h2>Grooming schedule</h2>
          <ul className="pc-schedule">
            {current.schedule.map(([task, when]) => (
              <li key={task}>
                <strong>{task}</strong>
                <span>{when}</span>
              </li>
            ))}
          </ul>

          <h2>How to groom, step by step</h2>
          {current.steps.map(([title, items], i) => (
            <details key={title} className="pc-step" open={i === 0}>
              <summary>{title}</summary>
              <ol>
                {items.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ol>
            </details>
          ))}
          <p className="pc-tip">💡 {current.tip}</p>

          <h2>Daily care essentials</h2>
          <ul className="pc-list">
            {current.care.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>

          <h2>Grooming kit</h2>
          <div className="pc-kit">
            {current.kit.map((k) => (
              <span key={k} className="pc-chip">{k}</span>
            ))}
          </div>
        </section>

        <section className="pc-block">
          <h2>Your first week together</h2>
          <div className="pc-grid">
            {FIRST_WEEK.map(([t, d]) => (
              <div key={t} className="pc-card"><h3>{t}</h3><p>{d}</p></div>
            ))}
          </div>
        </section>

        <section className="pc-block">
          <h2>Foods and things that can harm your pet</h2>
          <ul className="pc-toxic">
            {TOXIC.map(([what, who]) => (
              <li key={what}><strong>{what}</strong><span>{who}</span></li>
            ))}
          </ul>
          <p className="pc-note">If your pet eats something harmful, call a vet right away. Don't wait for symptoms, and don't try to make them vomit unless a vet tells you to.</p>
        </section>

        <section className="pc-block">
          <h2>Caring for pets in Cebu's climate</h2>
          <div className="pc-grid">
            {CLIMATE.map(([t, d]) => (
              <div key={t} className="pc-card"><h3>{t}</h3><p>{d}</p></div>
            ))}
          </div>
        </section>

        <section className="pc-emergency" aria-labelledby="pc-em">
          <h2 id="pc-em">🚨 See a vet right away if you notice</h2>
          <ul>
            {EMERGENCY.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <button type="button" className="pc-btn pc-danger" onClick={() => navigate("/vets")}>Find the nearest vet</button>
        </section>

        <p className="pc-disclaimer">
          This guide is general information and not a substitute for a veterinarian's advice. Every animal is different, so ask your vet about your own pet's needs.
        </p>
      </main>
    </div>
  );
}

const CSS = `
.pc-root { color: #0f172a; background: #f8fafc; min-height: 100vh; }
.pc-root *, .pc-root *::before, .pc-root *::after { box-sizing: border-box; }
.pc-hero { text-align: center; padding: 56px 20px 48px; color: #fff; background: linear-gradient(135deg, #0a3d40, #0d6b6e); }
.pc-eyebrow { display: inline-block; padding: 4px 14px; border-radius: 999px; background: rgba(255,255,255,.16); font-size: .78rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
.pc-hero h1 { margin: 14px 0 10px; font-size: clamp(1.9rem, 5vw, 2.8rem); line-height: 1.15; }
.pc-hero p { max-width: 560px; margin: 0 auto 22px; color: rgba(255,255,255,.88); font-size: 1.02rem; line-height: 1.55; }
.pc-hero-actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
.pc-btn { padding: 12px 24px; border: 2px solid #fff; border-radius: 999px; background: #fff; color: #0a3d40; font: inherit; font-weight: 700; cursor: pointer; }
.pc-btn.pc-ghost { background: transparent; color: #fff; }
.pc-btn.pc-danger { margin-top: 12px; background: #b91c1c; border-color: #b91c1c; color: #fff; }
.pc-btn:focus-visible, .pc-tab:focus-visible, .pc-step summary:focus-visible { outline: 3px solid #19a3a1; outline-offset: 3px; }
.pc-main { max-width: 900px; margin: 0 auto; padding: 28px 18px 80px; }
.pc-tabs { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 18px; }
.pc-tab { flex: 1; min-width: 120px; padding: 12px 14px; border: 2px solid #b8e6e3; border-radius: 14px; background: #fff; color: #0b5457; font: inherit; font-weight: 700; font-size: 1rem; cursor: pointer; }
.pc-tab.on { background: #0d6b6e; border-color: #0d6b6e; color: #fff; }
.pc-panel { padding: 24px; background: #fff; border: 1px solid #e2e8f0; border-radius: 20px; box-shadow: 0 6px 24px rgba(15,23,42,.06); }
.pc-panel h2, .pc-block h2 { margin: 26px 0 12px; font-size: 1.3rem; }
.pc-panel h2:first-of-type { margin-top: 18px; }
.pc-intro { margin: 0; color: #334155; font-size: 1.05rem; line-height: 1.6; }
.pc-schedule { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.pc-schedule li { display: grid; grid-template-columns: 150px 1fr; gap: 12px; padding: 12px 14px; border-radius: 12px; background: #ecf9f8; }
.pc-schedule strong { color: #0b5457; }
.pc-schedule span { color: #334155; line-height: 1.45; }
.pc-step { margin-bottom: 10px; border: 1px solid #e2e8f0; border-radius: 14px; background: #fff; }
.pc-step summary { padding: 14px 16px; font-weight: 700; cursor: pointer; }
.pc-step ol { margin: 0; padding: 0 20px 14px 38px; color: #334155; line-height: 1.6; }
.pc-step li { margin-bottom: 6px; }
.pc-tip { margin: 14px 0 0; padding: 14px 16px; border-radius: 12px; background: #fffbeb; border: 1px solid #fde68a; color: #92400e; line-height: 1.5; }
.pc-list { margin: 0; padding-left: 22px; color: #334155; line-height: 1.65; }
.pc-list li { margin-bottom: 8px; }
.pc-kit { display: flex; flex-wrap: wrap; gap: 8px; }
.pc-chip { padding: 6px 14px; border-radius: 999px; background: #ecfdf5; border: 1px solid #b8e6e3; color: #0b5457; font-size: .9rem; }
.pc-block { margin-top: 30px; }
.pc-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 14px; }
.pc-card { padding: 16px; background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; }
.pc-card h3 { margin: 0 0 6px; font-size: 1rem; color: #0b5457; }
.pc-card p { margin: 0; color: #334155; line-height: 1.55; font-size: .95rem; }
.pc-toxic { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.pc-toxic li { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 11px 14px; background: #fff; border: 1px solid #fecaca; border-radius: 12px; }
.pc-toxic span { color: #64748b; font-size: .9rem; }
.pc-note { margin: 12px 0 0; color: #475569; line-height: 1.55; }
.pc-emergency { margin-top: 32px; padding: 22px; background: #fef2f2; border: 2px solid #fca5a5; border-radius: 20px; }
.pc-emergency h2 { margin: 0 0 10px; color: #991b1b; font-size: 1.3rem; }
.pc-emergency ul { margin: 0; padding-left: 22px; color: #450a0a; line-height: 1.65; }
.pc-disclaimer { margin: 26px 0 0; text-align: center; color: #64748b; font-size: .85rem; line-height: 1.5; }
@media (max-width: 600px) {
  .pc-panel { padding: 18px; }
  .pc-schedule li { grid-template-columns: 1fr; gap: 2px; }
}
`;