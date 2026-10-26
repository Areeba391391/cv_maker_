import fs from "fs";

function replaceAll(file, pairs) {
  let s = fs.readFileSync(file, "utf8");
  for (const [a, b] of pairs) {
    if (!s.includes(a)) console.log("MISSING in", file, ":", a.slice(0, 70));
    s = s.split(a).join(b);
  }
  fs.writeFileSync(file, s);
}

replaceAll("src/app/(app)/cvs/new/new-cv-form.tsx", [
  ["Target job / position likhein", "Enter the target job title"],
  [
    "Kam az kam name / phone / city, ya koi file add karein",
    "Add at least a name, phone, city, or an attachment",
  ],
  [
    "Fill what the customer told you. Leave the rest blank — the CV still looks complete.",
    "Enter confirmed customer details. Empty sections stay out of the final CV.",
  ],
  ["Zaroori — job ka naam", "Required for generation"],
  ["Masalan: Salesman", "e.g. Salesman"],
  ["Basic info — placeholders dekh kar bharein", "Contact information provided by the customer"],
  ["Masalan: Ali Khan", "Full legal name"],
  ["Masalan: 03001234567", "Mobile number"],
  ["Email / Gmail", "Email"],
  ["Masalan: ali@gmail.com", "name@email.com"],
  ["Masalan: Islamabad", "City"],
  ["Matric, Inter, Bachelor… har ek alag — Add more", "Add each qualification separately"],
  ["Agar education batayi — Add more dabao", "No education added yet"],
  ["1, 2, 5, 10 jobs — jitni chahiye Add more", "Add each role separately"],
  ["Agar pehle kaam kiya — Add more dabao", "No experience added yet"],
  [
    "Duties — ek line pe ek\\nCustomer dealing\\nCash handling",
    "One responsibility per line",
  ],
  ["Jo certificates hain — har ek alag Add more", "Add each certificate separately"],
  ["Certificate ho to Add more — warna khali chhor dein", "Optional — leave empty if none"],
  ["College / personal / work projects — Add more", "Optional project entries"],
  ["Project ho to Add more — warna khali chhor dein", "Optional — leave empty if none"],
  ["Short details — kya banaya, tools, result", "Brief description, tools, outcome"],
  [
    "Customer ne diya ho to add karo — warna khali chhor dein (auto nahi)",
    "Only add references the customer provided",
  ],
  ["Reference naam/phone mile to Add more — warna skip", "Optional — leave empty if none"],
  ["Optional notes, voice, photo, purana CV", "Notes, voice, images, or an existing CV"],
  ["Extra notes (optional)", "Add notes"],
  ["Koi aur baat jo upar fields mein fit na ho", "Anything that does not fit the fields above"],
  ["Add only what the customer gave. Then generate.", "Review entries, then generate"],
  ["Please wait — this usually takes a few seconds.", "Building a print-ready CV…"],
  ["Click to add", "Browse"],
  [
    `const STAGE_MESSAGES = [
  "Reading customer information...",
  "Processing voice...",
  "Reading image...",
  "Extracting details...",
  "Combining information...",
  "Checking information...",
  "Writing professional English...",
  "Building CV...",
  "Preparing document...",
];`,
    `const STAGE_MESSAGES = [
  "Reading customer information…",
  "Processing voice input…",
  "Reading images…",
  "Extracting details…",
  "Merging sources…",
  "Validating fields…",
  "Writing professional English…",
  "Assembling CV…",
  "Finalizing document…",
];`,
  ],
]);

replaceAll("src/components/cv/cv-workspace.tsx", [
  [
    'multiPage ? " · long CV (try Compact / A− for 1 page)" : " · targeting 1 page"',
    'multiPage ? " · multi-page layout" : " · single-page layout"',
  ],
  [
    `                    ? \`Content ab \${maxPages} page pe ja sakta hai (preview mein line dikhegi).\`
                    : "Abhi 1 page fit ho raha hai."`,
    `                    ? \`Layout allows up to \${maxPages} pages.\`
                    : "Fitted to one page."`,
  ],
  ["Spacing (content ke hisaab se)", "Spacing"],
  [
    `                  Default: 1 page. Kam content = fill. Zyada = compact. Pages = 2 choose
                  karke next sheet pe bhej sakte ho.
                  {data.metadata.density === "auto" || !data.metadata.density
                    ? \` Abhi auto → \${density}.\`
                    : ""}`,
    `                  Auto balances density for print. Current: {density}.`,
  ],
  ["1, 2, 5, 10 jobs — jitni chahiye add karo", "Add each role separately"],
  ["Abhi koi job nahi — pehli job add karein", "No experience added yet"],
  [
    'placeholder={"Duties — ek line pe ek kaam\\nCustomer dealing\\nCash handling"}',
    'placeholder={"One responsibility per line"}',
  ],
  ["Abhi education nahi — Matric / Inter / etc. add karein", "No education added yet"],
  ["Certificate nahi to khali chhor dein", "Optional — leave empty if none"],
  ["Project nahi to khali chhor dein", "Optional — leave empty if none"],
  ["Customer ne diya ho to add — warna khali (auto nahi)", "Only add provided references"],
  ["Reference nahi to khali chhor dein", "Optional — leave empty if none"],
]);

console.log("done");
