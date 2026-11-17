// Adopter screening: the questions, validation, and how shelters read the answers.
// The level is always computed from the raw answers when a shelter opens an
// application, never stored, so an applicant can't write themselves a good score.

export const OPTIONS = {
  housing: [
    ["own", "I own my home"],
    ["rent", "I rent"],
    ["family", "I live with family"],
    ["other", "Other"],
  ],
  landlord: [
    ["yes", "Yes, my landlord allows pets"],
    ["no", "No"],
    ["unsure", "Not sure yet"],
  ],
  householdAgrees: [
    ["yes", "Yes"],
    ["no", "No"],
    ["unsure", "Not sure"],
  ],
  hoursAlone: [
    ["lt4", "Less than 4 hours"],
    ["4to8", "4 to 8 hours"],
    ["8to12", "8 to 12 hours"],
    ["gt12", "More than 12 hours"],
  ],
  petStays: [
    ["indoors", "Indoors with the family"],
    ["indoors_yard", "Indoors, with a fenced yard or safe outdoor space"],
    ["outdoors", "Mostly outdoors"],
    ["confined", "In a cage, or tied up, most of the day"],
  ],
  experience: [
    ["first", "First-time owner"],
    ["some", "Some experience"],
    ["experienced", "Very experienced"],
  ],
  vetCosts: [
    ["yes", "Yes, I've budgeted for food, vaccines and emergencies"],
    ["unsure", "I'm not sure yet"],
    ["no", "No"],
  ],
  previousPets: [
    ["never", "I've never had a pet"],
    ["kept", "I have or had pets and kept them"],
    ["gave_up", "I've given up or rehomed a pet before"],
  ],
};

export const EMPTY_SCREENING = {
  housing: "",
  landlord: "",
  householdAgrees: "",
  hoursAlone: "",
  petStays: "",
  experience: "",
  vetCosts: "",
  previousPets: "",
  previousPetsNote: "",
  vetReference: "",
  agreeCheckIns: false,
  agreeReturn: false,
  agreeCare: false,
};

export const labelOf = (group, value) => OPTIONS[group]?.find(([v]) => v === value)?.[1] || "";

const REQUIRED = ["housing", "householdAgrees", "hoursAlone", "petStays", "experience", "vetCosts", "previousPets"];

export function validateScreening(s) {
  const errs = {};
  REQUIRED.forEach((k) => {
    if (!s[k]) errs[k] = "Choose an option.";
  });
  if (s.housing === "rent" && !s.landlord) errs.landlord = "Choose an option.";
  if (s.previousPets === "gave_up" && s.previousPetsNote.trim().length < 10) {
    errs.previousPetsNote = "Please tell us briefly what happened.";
  }
  if (!s.agreeCheckIns) errs.agreeCheckIns = "Please confirm to continue.";
  if (!s.agreeReturn) errs.agreeReturn = "Please confirm to continue.";
  if (!s.agreeCare) errs.agreeCare = "Please confirm to continue.";
  return errs;
}

// What gets saved on the application.
export function cleanScreening(s) {
  return {
    housing: s.housing,
    ...(s.housing === "rent" ? { landlord: s.landlord } : {}),
    householdAgrees: s.householdAgrees,
    hoursAlone: s.hoursAlone,
    petStays: s.petStays,
    experience: s.experience,
    vetCosts: s.vetCosts,
    previousPets: s.previousPets,
    ...(s.previousPets === "gave_up" ? { previousPetsNote: s.previousPetsNote.trim().slice(0, 300) } : {}),
    ...(s.vetReference.trim() ? { vetReference: s.vetReference.trim().slice(0, 120) } : {}),
    agreeCheckIns: true,
    agreeReturn: true,
    agreeCare: true,
  };
}

export const LEVELS = {
  concern: { label: "Review carefully", icon: "⚠️" },
  review: { label: "Worth a conversation", icon: "💬" },
  ready: { label: "Looks ready", icon: "✅" },
};

/**
 * Reads the applicant's own answers and returns { level, flags, strengths }.
 * It's a guide for the shelter, not a decision: always follow up with a call,
 * a reference or a home visit.
 */
export function evaluateScreening(s, petType = "") {
  if (!s) return null;
  const type = String(petType).toLowerCase();
  const isDog = /dog|puppy/.test(type);
  const flags = [];
  const strengths = [];
  const add = (severity, text) => flags.push({ severity, text });

  if (s.petStays === "confined") add("high", "Says the pet would be caged or tied up for most of the day.");
  if (s.petStays === "outdoors") add("medium", "Pet would live mostly outdoors. Ask about shade, shelter from rain and safety.");

  if (s.vetCosts === "no") add("high", "Hasn't budgeted for food, vaccines or vet emergencies.");
  if (s.vetCosts === "unsure") add("medium", "Unsure about paying for vet care. Talk through the costs.");

  if (s.housing === "rent" && s.landlord === "no") add("high", "Rents, and the landlord doesn't allow pets.");
  if (s.housing === "rent" && s.landlord === "unsure") add("medium", "Rents and hasn't confirmed the landlord allows pets. Ask for written permission.");

  if (s.householdAgrees === "no") add("high", "Not everyone in the household agrees to adopt.");
  if (s.householdAgrees === "unsure") add("medium", "Hasn't confirmed everyone at home agrees.");

  if (s.hoursAlone === "gt12") add(isDog ? "high" : "medium", `Would leave the pet alone more than 12 hours a day${isDog ? ", which is too long for a dog" : ""}.`);
  if (s.hoursAlone === "8to12" && isDog) add("medium", "Would leave a dog alone 8 to 12 hours a day. Ask who checks on it.");

  if (s.previousPets === "gave_up") add("medium", `Has given up or rehomed a pet before${s.previousPetsNote ? `: “${s.previousPetsNote}”` : "."}`);
  if (s.experience === "first") add("info", "First-time owner. Consider sharing care tips or offering a trial period.");

  if (s.vetCosts === "yes") strengths.push("Has budgeted for vet care");
  if (s.housing === "own" || (s.housing === "rent" && s.landlord === "yes")) strengths.push("Home situation allows pets");
  if (s.petStays === "indoors" || s.petStays === "indoors_yard") strengths.push("Pet would live indoors with the family");
  if (s.hoursAlone === "lt4" || s.hoursAlone === "4to8") strengths.push("Won't leave the pet alone for long");
  if (s.householdAgrees === "yes") strengths.push("Household agrees to adopt");
  if (s.experience === "some" || s.experience === "experienced") strengths.push("Has pet experience");
  if (s.previousPets === "kept") strengths.push("Has kept pets long term");
  if (s.vetReference) strengths.push("Gave a vet you can call");

  const order = { high: 0, medium: 1, info: 2 };
  flags.sort((a, b) => order[a.severity] - order[b.severity]);

  const level = flags.some((f) => f.severity === "high") ? "concern" : flags.some((f) => f.severity === "medium") ? "review" : "ready";
  return { level, ...LEVELS[level], flags, strengths };
}
