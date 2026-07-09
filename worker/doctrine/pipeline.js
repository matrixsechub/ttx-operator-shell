const DEFAULT_DOCTRINE_SOURCE_URL = "https://matrixsechub.writing.io/";
const MAX_CHUNK_CHARACTERS = 1800;
const MAX_CHUNK_WORDS = 260;
const SAFE_PROTOCOLS = new Set(["http:", "https:"]);
const CLASSIFICATION_RULES = [
  {
    classification: "INTAKE_SCORING",
    keywords: ["intake", "routing", "triage", "score", "scoring", "qualification", "priority"],
  },
  {
    classification: "ACL_POLICY",
    keywords: ["acl", "permission", "access control", "least privilege", "policy", "allow", "deny"],
  },
  {
    classification: "ESCALATION_PATHS",
    keywords: ["escalation", "containment", "handoff", "pager", "operator", "incident"],
  },
  {
    classification: "RED_TEAM_PROTOCOLS",
    keywords: ["red team", "adversary", "attack chain", "exploit", "exercise", "test plan"],
  },
  {
    classification: "REPORTING_STANDARDS",
    keywords: ["report", "finding", "evidence", "brief", "artifact", "remediation"],
  },
];

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeWhitespace(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodeHtmlEntities(value) {
  const namedEntities = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": "\"",
    "&#39;": "'",
    "&nbsp;": " ",
  };

  return String(value || "")
    .replace(/&(amp|lt|gt|quot|nbsp);|&#39;/gi, (match) => namedEntities[match.toLowerCase()] || match)
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function stripTags(value) {
  return String(value || "").replace(/<\/?[^>]+>/g, " ");
}

function normalizeDoctrineSourceUrl(value) {
  const raw = normalizeText(value) || DEFAULT_DOCTRINE_SOURCE_URL;
  const url = new URL(raw);
  url.hash = "";
  url.search = "";
  if (!url.pathname) {
    url.pathname = "/";
  }
  return url.toString();
}

function getDoctrineAllowlist(env) {
  const configured = normalizeText(env.DOCTRINE_SOURCE_ALLOWLIST);
  const values = configured
    ? configured.split(",").map((entry) => normalizeDoctrineSourceUrl(entry)).filter(Boolean)
    : [normalizeDoctrineSourceUrl(DEFAULT_DOCTRINE_SOURCE_URL)];

  if (!values.length) {
    throw new Error("DOCTRINE_SOURCE_ALLOWLIST must contain at least one URL.");
  }

  return values;
}

function assertDoctrineSourceUrlAllowed(env, sourceUrl) {
  const normalizedSourceUrl = normalizeDoctrineSourceUrl(sourceUrl);
  const allowlist = getDoctrineAllowlist(env);

  if (!allowlist.includes(normalizedSourceUrl)) {
    throw new Error(`Doctrine source URL is not allowlisted: ${normalizedSourceUrl}`);
  }

  return normalizedSourceUrl;
}

function sanitizeDoctrineHtml(html) {
  return String(html || "")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|iframe|object|embed|svg|math|form|input|button|textarea|select|video|audio|canvas)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(meta|link|base)[^>]*>/gi, " ")
    .replace(/\son[a-z]+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, "")
    .replace(/\sstyle\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, "")
    .replace(/\s(href|src)\s*=\s*("javascript:[^"]*"|'javascript:[^']*'|javascript:[^\s>]+)/gi, "")
    .replace(/\s(href|src)\s*=\s*("data:[^"]*"|'data:[^']*'|data:[^\s>]+)/gi, "");
}

function toInlineMarkdown(fragment) {
  let output = String(fragment || "");

  output = output.replace(
    /<a\b[^>]*href\s*=\s*("([^"]*)"|'([^']*)')[^>]*>([\s\S]*?)<\/a>/gi,
    (_, __, hrefA, hrefB, label) => {
      const href = normalizeText(hrefA || hrefB);
      try {
        const url = new URL(href, DEFAULT_DOCTRINE_SOURCE_URL);
        if (!SAFE_PROTOCOLS.has(url.protocol)) {
          return toInlineMarkdown(label);
        }
        return `[${toInlineMarkdown(label)}](${url.toString()})`;
      } catch {
        return toInlineMarkdown(label);
      }
    },
  );

  output = output.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, text) => `**${toInlineMarkdown(text)}**`);
  output = output.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, text) => `_${toInlineMarkdown(text)}_`);
  output = output.replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, (_, text) => `\`${decodeHtmlEntities(stripTags(text)).trim()}\``);
  output = output.replace(/<br\s*\/?>/gi, "\n");
  output = decodeHtmlEntities(stripTags(output));

  return normalizeWhitespace(output);
}

function convertHtmlListsToMarkdown(value) {
  return value.replace(/<(ul|ol)[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, inner) => {
    const items = [...inner.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map((match) => `- ${toInlineMarkdown(match[1])}`);
    return items.length ? `\n${items.join("\n")}\n\n` : "\n";
  });
}

function htmlToCanonicalMarkdown(untrustedHtml) {
  let markdown = sanitizeDoctrineHtml(untrustedHtml);

  markdown = markdown.replace(/<pre\b[^>]*>([\s\S]*?)<\/pre>/gi, (_, content) => {
    const code = decodeHtmlEntities(stripTags(content)).trim();
    return code ? `\n\n\`\`\`\n${code}\n\`\`\`\n\n` : "\n";
  });
  markdown = markdown.replace(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, content) => {
    const lines = toInlineMarkdown(content)
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => `> ${line}`);
    return lines.length ? `\n\n${lines.join("\n")}\n\n` : "\n";
  });
  markdown = markdown.replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level, content) => {
    const prefix = "#".repeat(Number(level));
    return `\n\n${prefix} ${toInlineMarkdown(content)}\n\n`;
  });
  markdown = convertHtmlListsToMarkdown(markdown);
  markdown = markdown.replace(/<p\b[^>]*>([\s\S]*?)<\/p>/gi, (_, content) => {
    const paragraph = toInlineMarkdown(content);
    return paragraph ? `\n\n${paragraph}\n\n` : "\n";
  });
  markdown = markdown.replace(/<hr\s*\/?>/gi, "\n\n---\n\n");
  markdown = markdown.replace(/<(section|article|main|div)[^>]*>/gi, "\n");
  markdown = markdown.replace(/<\/(section|article|main|div)>/gi, "\n");
  markdown = markdown.replace(/<\/?[^>]+>/g, " ");
  markdown = decodeHtmlEntities(markdown);
  markdown = normalizeWhitespace(markdown);

  if (!markdown) {
    throw new Error("Doctrine markdown is empty after sanitization.");
  }

  return markdown;
}

function splitOversizedChunk(content, maxChars, maxWords) {
  const paragraphs = normalizeWhitespace(content)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const chunks = [];
  let buffer = [];
  let bufferWordCount = 0;

  for (const paragraph of paragraphs) {
    const paragraphWordCount = paragraph.split(/\s+/).filter(Boolean).length;
    const candidate = buffer.length ? `${buffer.join("\n\n")}\n\n${paragraph}` : paragraph;
    const candidateWordCount = bufferWordCount + paragraphWordCount;

    if (candidate.length > maxChars || candidateWordCount > maxWords) {
      if (buffer.length) {
        chunks.push(buffer.join("\n\n"));
      }
      buffer = [paragraph];
      bufferWordCount = paragraphWordCount;
      continue;
    }

    buffer.push(paragraph);
    bufferWordCount = candidateWordCount;
  }

  if (buffer.length) {
    chunks.push(buffer.join("\n\n"));
  }

  return chunks;
}

function chunkDoctrineMarkdown(markdown, options = {}) {
  const maxChars = Number(options.maxChars) || MAX_CHUNK_CHARACTERS;
  const maxWords = Number(options.maxWords) || MAX_CHUNK_WORDS;
  const sections = normalizeWhitespace(markdown)
    .split(/\n(?=#{1,6}\s)/g)
    .map((section) => section.trim())
    .filter(Boolean);

  const chunkBodies = [];
  for (const section of sections.length ? sections : [normalizeWhitespace(markdown)]) {
    const wordCount = section.split(/\s+/).filter(Boolean).length;
    if (section.length <= maxChars && wordCount <= maxWords) {
      chunkBodies.push(section);
      continue;
    }
    chunkBodies.push(...splitOversizedChunk(section, maxChars, maxWords));
  }

  return chunkBodies.map((content, index) => ({
    index: index + 1,
    markdown: content,
    wordCount: content.split(/\s+/).filter(Boolean).length,
  }));
}

async function hashDoctrineChunk(markdown) {
  const payload = new TextEncoder().encode(markdown);
  const digest = await crypto.subtle.digest("SHA-256", payload);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function classifyDoctrineChunk(markdown) {
  const haystack = normalizeText(markdown).toLowerCase();
  let best = { classification: "GENERAL_DOCTRINE", score: 0 };

  for (const rule of CLASSIFICATION_RULES) {
    const score = rule.keywords.reduce((total, keyword) => total + (haystack.includes(keyword) ? 1 : 0), 0);
    if (score > best.score) {
      best = { classification: rule.classification, score };
    }
  }

  return best.classification;
}

async function fetchDoctrineSourceHtml(env, sourceUrl = null) {
  const allowlist = getDoctrineAllowlist(env);
  const targetUrl = assertDoctrineSourceUrlAllowed(env, sourceUrl || allowlist[0]);
  const response = await fetch(targetUrl, {
    method: "GET",
    headers: {
      Accept: "text/html,application/xhtml+xml;q=0.9,text/plain;q=0.8",
      "User-Agent": "mshops-doctrine-sync/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Doctrine source fetch failed with status ${response.status}.`);
  }

  return {
    sourceUrl: targetUrl,
    html: await response.text(),
  };
}

async function buildDoctrineSyncPayload(env, { sourceUrl = null, previousHashes = [] } = {}) {
  const fetched = await fetchDoctrineSourceHtml(env, sourceUrl);
  const markdown = htmlToCanonicalMarkdown(fetched.html);
  const previousHashSet = new Set(Array.isArray(previousHashes) ? previousHashes : []);
  const chunkSkeletons = chunkDoctrineMarkdown(markdown);

  const chunks = await Promise.all(
    chunkSkeletons.map(async (chunk) => {
      const hash = await hashDoctrineChunk(chunk.markdown);
      return {
        index: chunk.index,
        markdown: chunk.markdown,
        wordCount: chunk.wordCount,
        hash,
        classification: classifyDoctrineChunk(chunk.markdown),
        diffStatus: previousHashSet.has(hash) ? "UNCHANGED" : "NEW",
      };
    }),
  );

  const newChunkCount = chunks.filter((chunk) => chunk.diffStatus === "NEW").length;

  return {
    sourceUrl: fetched.sourceUrl,
    markdown,
    chunks,
    totalChunkCount: chunks.length,
    newChunkCount,
    hasChanges: newChunkCount > 0 || previousHashes.length !== chunks.length,
  };
}

export {
  DEFAULT_DOCTRINE_SOURCE_URL,
  assertDoctrineSourceUrlAllowed,
  buildDoctrineSyncPayload,
  chunkDoctrineMarkdown,
  classifyDoctrineChunk,
  fetchDoctrineSourceHtml,
  getDoctrineAllowlist,
  hashDoctrineChunk,
  htmlToCanonicalMarkdown,
  normalizeDoctrineSourceUrl,
  sanitizeDoctrineHtml,
};
