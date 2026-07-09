import fs from "node:fs";

const files = [
  "public/index.html",
  "public/marketplace.html",
  "public/about.html",
  "public/brand.html",
  "public/contact.html",
  "public/docs.html",
  "public/ecosystem.html",
  "public/intake.html",
  "public/mission.html",
  "public/roadmap.html",
  "public/scenario.html",
  "public/start.html",
  "public/status.html",
];

const enterpriseCta =
  '<a class="register-cta-enterprise pulse mono" href="/register" aria-label="Register for Access">Register for Access</a>';

for (const file of files) {
  let content = fs.readFileSync(file, "utf8");
  content = content.replaceAll(
    '<a href="/register" aria-label="Register for Access">Register</a>',
    enterpriseCta,
  );
  content = content.replaceAll(
    '<a href="/register" aria-label="Register for Access">Register for Access</a>',
    enterpriseCta,
  );
  content = content.replaceAll(
    '<a class="button secondary" href="/register" aria-label="Register for Access">Register for Access</a>',
    enterpriseCta,
  );
  content = content.replaceAll(
    '<a class="button primary" href="/register" aria-label="Register for Access">Register for Access</a>',
    enterpriseCta,
  );
  if (!content.includes("/styles/nav.css")) {
    content = content.replace(
      '<link rel="stylesheet" href="/styles/a11y.css" />',
      '<link rel="stylesheet" href="/styles/nav.css" />\n    <link rel="stylesheet" href="/styles/a11y.css" />',
    );
  }
  fs.writeFileSync(file, content);
  console.log("patched", file);
}
