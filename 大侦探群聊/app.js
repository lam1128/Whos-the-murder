const STORAGE_KEY = "detective_group_chat_local_v3";
const EXPORT_VERSION = 3;
const GAP_FOR_DIVIDER_MS = 3 * 60 * 1000;
const TICK_INTERVAL_MS = 1000;
const PROACTIVE_IDLE_MS = 5 * 60 * 1000;
const ACTIVE_CHARACTER_IDS = ["he_jiong", "wang_ou"];
const MENTION_TOKENS = ["@全体成员", "@何炅", "@王鸥"];

const CHARACTER_REGISTRY = {
  he_jiong: {
    id: "he_jiong",
    name: "何炅",
    shortLabel: "何",
    role: "自由剑修",
    active: true,
    colorKey: "he_jiong",
    aliases: ["何炅", "老何"],
    keywordWeights: {
      委托: 3,
      承务所: 4,
      巡查: 3,
      调查: 3,
      路上: 2,
      吃饭: 2,
      点心: 2,
      回家: 2,
      帮忙: 2,
      一起: 2,
      见面: 2,
      休息: 1,
      晚饭: 2,
    },
    topicWeights: {
      commission: 3,
      meal: 2,
      health: 2,
      rest: 2,
      shopping: 2,
      invite: 2,
      secret: 2,
      weather: 1,
    },
    defaultState: {
      availability: "空闲",
      mood: "放松",
      currentActivity: "刚从承务所出来，顺路整理今天的委托记录",
      lastSpokeAt: 0,
      lastReadAt: 0,
    },
  },
  wang_ou: {
    id: "wang_ou",
    name: "王鸥",
    shortLabel: "鸥",
    role: "灵药师",
    active: true,
    colorKey: "wang_ou",
    aliases: ["王鸥"],
    keywordWeights: {
      药: 4,
      包扎: 4,
      淋雨: 3,
      伤口: 4,
      吃饭: 2,
      热汤: 3,
      药材: 4,
      点心: 2,
      休息: 3,
      睡: 2,
      头疼: 4,
      不舒服: 4,
      一起: 1,
      晚饭: 2,
    },
    topicWeights: {
      commission: 2,
      meal: 3,
      health: 4,
      rest: 3,
      shopping: 3,
      invite: 1,
      secret: 1,
      weather: 1,
    },
    defaultState: {
      availability: "稍忙",
      mood: "清醒",
      currentActivity: "在药铺外核对新送来的药材和账册",
      lastSpokeAt: 0,
      lastReadAt: 0,
    },
  },
  wu_xin: {
    id: "wu_xin",
    name: "吴昕",
    shortLabel: "吴",
    role: "预留扩展位",
    active: false,
  },
  sa_beining: {
    id: "sa_beining",
    name: "撒贝宁",
    shortLabel: "撒",
    role: "预留扩展位",
    active: false,
  },
  gui_gui: {
    id: "gui_gui",
    name: "鬼鬼",
    shortLabel: "鬼",
    role: "预留扩展位",
    active: false,
  },
};

const TOPIC_PATTERNS = {
  commission: ["委托", "承务所", "任务", "调查", "巡查", "妖兽", "线索"],
  meal: ["吃", "饭", "饿", "菜", "茶", "点心", "夜宵", "热汤", "晚饭"],
  health: ["伤", "药", "包扎", "淋雨", "发热", "头疼", "不舒服", "疼"],
  rest: ["休息", "累", "困", "睡", "歇", "发呆"],
  shopping: ["买", "铺", "店", "药材", "采购", "挑", "带"],
  invite: ["一起", "来吗", "去吗", "见面", "约", "碰头"],
  weather: ["雨", "风", "天", "冷", "热", "路上"],
  joke: ["哈哈", "好笑", "逗", "玩笑", "乐", "笑死"],
  secret: ["先别告诉", "悄悄", "别告诉", "只和你说"],
  memory: ["记住", "记一下", "别忘", "以后", "下次"],
};

const WEEKDAY_LABELS = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

const dom = {
  messageList: document.querySelector("#message-list"),
  sharedMemoryList: document.querySelector("#shared-memory-list"),
  privateMemoryGrid: document.querySelector("#private-memory-grid"),
  memberList: document.querySelector("#member-list"),
  composer: document.querySelector("#composer"),
  chatInput: document.querySelector("#chat-input"),
  typingRow: document.querySelector("#typing-row"),
  typingList: document.querySelector("#typing-list"),
  saveIndicator: document.querySelector("#save-indicator"),
  resetButton: document.querySelector("#reset-button"),
  exportButton: document.querySelector("#export-button"),
  sendButton: document.querySelector("#send-button"),
  messageTemplate: document.querySelector("#message-template"),
  quickMentionButtons: Array.from(document.querySelectorAll(".quick-mention-button")),
};

let runtimeIntervalId = null;
let lastTypingSignature = "";
let isComposing = false;
let state = loadState();

function cloneData(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
}

function currentTimestamp() {
  return Date.now();
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatClockTime(timestamp) {
  const date = new Date(timestamp);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function isSameDay(leftTimestamp, rightTimestamp) {
  const left = new Date(leftTimestamp);
  const right = new Date(rightTimestamp);
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function startOfDay(timestamp) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function dayDifference(fromTimestamp, toTimestamp) {
  return Math.floor((startOfDay(toTimestamp) - startOfDay(fromTimestamp)) / (24 * 60 * 60 * 1000));
}

function formatDividerTime(timestamp, referenceTimestamp = currentTimestamp()) {
  const diffDays = dayDifference(timestamp, referenceTimestamp);

  if (diffDays <= 0) {
    return formatClockTime(timestamp);
  }

  if (diffDays === 1) {
    return `昨天 ${formatClockTime(timestamp)}`;
  }

  if (diffDays <= 6) {
    return `${WEEKDAY_LABELS[new Date(timestamp).getDay()]} ${formatClockTime(timestamp)}`;
  }

  const date = new Date(timestamp);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${formatClockTime(timestamp)}`;
}

function shouldRenderDivider(previousTimestamp, currentMessageTimestamp) {
  if (!previousTimestamp) {
    return true;
  }

  if (!isSameDay(previousTimestamp, currentMessageTimestamp)) {
    return true;
  }

  return currentMessageTimestamp - previousTimestamp >= GAP_FOR_DIVIDER_MS;
}

function textSeed(text, offset = 0) {
  return Array.from(text).reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 1), 17 + offset);
}

function pickBySeed(list, seed) {
  return list[Math.abs(seed) % list.length];
}

function findTopics(text) {
  return Object.entries(TOPIC_PATTERNS)
    .filter(([, keywords]) => keywords.some((keyword) => text.includes(keyword)))
    .map(([topic]) => topic);
}

function parseMentions(text) {
  const mentionInfo = {
    all: text.includes("@全体成员"),
    ids: [],
  };

  if (mentionInfo.all) {
    mentionInfo.ids = [...ACTIVE_CHARACTER_IDS];
    return mentionInfo;
  }

  mentionInfo.ids = ACTIVE_CHARACTER_IDS.filter((characterId) => {
    const character = CHARACTER_REGISTRY[characterId];
    return character.aliases.some((alias) => text.includes(`@${alias}`));
  });

  return mentionInfo;
}

function excerptText(text, maxLength = 28) {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength)}…`;
}

function stripMentions(text) {
  return MENTION_TOKENS.reduce((result, token) => result.replaceAll(token, ""), text)
    .replace(/[，,。；;：:\s]+/g, " ")
    .trim();
}

function createSeedMessages(now) {
  const introTime = now - 4 * 60 * 1000;
  const heTime = now - 2 * 60 * 1000;
  const wangTime = now - 40 * 1000;

  return [
    createMessage(
      "system",
      "群聊时间线独立于主线存档。你和何炅、王鸥已经相识约一年多，可以自然聊天、约饭、聊委托，也可以让他们记住你的明确偏好。",
      { sentAt: introTime }
    ),
    createMessage("he_jiong", "我刚从承务所出来，今天总算没下大雨。你要是在路上，慢一点走。", {
      sentAt: heTime,
    }),
    createMessage("wang_ou", "我这边在看新送来的药材。要是你今天忙完了，晚些可以顺便聊聊晚饭。", {
      sentAt: wangTime,
    }),
  ];
}

function makeDefaultState() {
  const now = currentTimestamp();
  const messages = createSeedMessages(now);

  return {
    version: EXPORT_VERSION,
    turn: 2,
    messages,
    pendingReplies: [],
    sharedMemory: [
      {
        id: "memory-baseline",
        label: "关系基线",
        detail: "你与何炅、王鸥已经相识约一年多，聊天默认自然熟悉。",
        source: "初始化设定",
      },
    ],
    privateMemory: {
      he_jiong: [],
      wang_ou: [],
    },
    characters: {
      he_jiong: {
        ...cloneData(CHARACTER_REGISTRY.he_jiong.defaultState),
        lastSpokeAt: messages[1].sentAt,
        lastReadAt: messages[messages.length - 1].sentAt,
      },
      wang_ou: {
        ...cloneData(CHARACTER_REGISTRY.wang_ou.defaultState),
        lastSpokeAt: messages[2].sentAt,
        lastReadAt: messages[messages.length - 1].sentAt,
      },
    },
  };
}

function normalizeState(parsed) {
  const fallback = makeDefaultState();

  return {
    ...fallback,
    ...parsed,
    characters: {
      he_jiong: {
        ...cloneData(CHARACTER_REGISTRY.he_jiong.defaultState),
        ...(parsed.characters?.he_jiong ?? {}),
      },
      wang_ou: {
        ...cloneData(CHARACTER_REGISTRY.wang_ou.defaultState),
        ...(parsed.characters?.wang_ou ?? {}),
      },
    },
    privateMemory: {
      he_jiong: parsed.privateMemory?.he_jiong ?? [],
      wang_ou: parsed.privateMemory?.wang_ou ?? [],
    },
    sharedMemory: parsed.sharedMemory ?? fallback.sharedMemory,
    pendingReplies: Array.isArray(parsed.pendingReplies) ? parsed.pendingReplies : [],
    messages: Array.isArray(parsed.messages) ? parsed.messages : fallback.messages,
  };
}

function loadState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return makeDefaultState();
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return makeDefaultState();
    }

    return normalizeState(parsed);
  } catch {
    return makeDefaultState();
  }
}

function saveState(note = "已自动保存到本地") {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  dom.saveIndicator.textContent = note;
}

function createMessage(speakerId, text, options = {}) {
  const speakerName =
    speakerId === "system"
      ? "群聊"
      : speakerId === "player"
        ? "你"
        : CHARACTER_REGISTRY[speakerId].name;

  return {
    id: options.id ?? `${speakerId}-${options.sentAt ?? currentTimestamp()}-${Math.random().toString(36).slice(2, 8)}`,
    speakerId,
    speakerName,
    text,
    sentAt: options.sentAt ?? currentTimestamp(),
    quotes: options.quotes ?? [],
  };
}

function appendMessage(message) {
  state.messages.push(message);
  state.messages.sort((left, right) => left.sentAt - right.sentAt);
}

function getNonSystemMessages() {
  return state.messages.filter((message) => message.speakerId !== "system");
}

function getLatestActivityTimestamp() {
  const nonSystemMessages = getNonSystemMessages();
  return nonSystemMessages.length ? nonSystemMessages[nonSystemMessages.length - 1].sentAt : 0;
}

function isConversationActive() {
  const latestActivity = getLatestActivityTimestamp();
  return latestActivity > 0 && currentTimestamp() - latestActivity < GAP_FOR_DIVIDER_MS;
}

function tokenizeEditorText(text) {
  const sortedTokens = [...MENTION_TOKENS].sort((left, right) => right.length - left.length);
  const fragments = [];
  let cursor = 0;

  while (cursor < text.length) {
    const mentionToken = sortedTokens.find((token) => text.startsWith(token, cursor));
    if (mentionToken) {
      fragments.push({ type: "mention", text: mentionToken });
      cursor += mentionToken.length;
      continue;
    }

    fragments.push({ type: "text", text: text[cursor] });
    cursor += 1;
  }

  return fragments;
}

function renderEditorMarkup(text) {
  if (!text) {
    return "";
  }

  return tokenizeEditorText(text)
    .map((fragment) => {
      const escaped = escapeHtml(fragment.text).replace(/\n/g, "<br>");
      return fragment.type === "mention" ? `<span class="composer-mention">${escaped}</span>` : escaped;
    })
    .join("");
}

function extractPlainText(node) {
  if (!node) {
    return "";
  }

  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? "";
  }

  if (node.nodeName === "BR") {
    return "\n";
  }

  return Array.from(node.childNodes).map((childNode) => extractPlainText(childNode)).join("");
}

function normalizeEditorText(text) {
  return text.replace(/\r/g, "").replace(/\u00a0/g, " ").slice(0, 240);
}

function getEditorText() {
  return normalizeEditorText(extractPlainText(dom.chatInput));
}

function getCaretOffset(root) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return getEditorText().length;
  }

  const range = selection.getRangeAt(0);
  const preRange = range.cloneRange();
  preRange.selectNodeContents(root);
  preRange.setEnd(range.endContainer, range.endOffset);
  return normalizeEditorText(preRange.toString()).length;
}

function setCaretOffset(root, targetOffset) {
  const selection = window.getSelection();
  if (!selection) {
    return;
  }

  const range = document.createRange();
  let remaining = targetOffset;
  let placed = false;

  function walk(node) {
    if (placed) {
      return;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      const length = node.textContent?.length ?? 0;
      if (remaining <= length) {
        range.setStart(node, remaining);
        range.collapse(true);
        placed = true;
        return;
      }
      remaining -= length;
      return;
    }

    if (node.nodeName === "BR") {
      if (remaining <= 1) {
        range.setStartAfter(node);
        range.collapse(true);
        placed = true;
        return;
      }
      remaining -= 1;
      return;
    }

    Array.from(node.childNodes).forEach((childNode) => walk(childNode));
  }

  walk(root);

  if (!placed) {
    range.selectNodeContents(root);
    range.collapse(false);
  }

  selection.removeAllRanges();
  selection.addRange(range);
}

function setEditorText(text, caretOffset = null) {
  const normalized = normalizeEditorText(text);
  dom.chatInput.innerHTML = renderEditorMarkup(normalized);
  const finalOffset = caretOffset == null ? normalized.length : Math.min(caretOffset, normalized.length);
  setCaretOffset(dom.chatInput, finalOffset);
}

function syncEditorMarkup() {
  const offset = getCaretOffset(dom.chatInput);
  const text = getEditorText();
  setEditorText(text, offset);
}

function insertTextAtCursor(insertedText) {
  const text = getEditorText();
  const offset = getCaretOffset(dom.chatInput);
  const nextText = `${text.slice(0, offset)}${insertedText}${text.slice(offset)}`;
  setEditorText(nextText, offset + insertedText.length);
  dom.chatInput.focus();
}

function insertMentionToken(token) {
  const text = getEditorText();
  const offset = getCaretOffset(dom.chatInput);
  const previousChar = text[offset - 1] ?? "";
  const nextChar = text[offset] ?? "";
  const prefix = previousChar && !/\s/.test(previousChar) ? " " : "";
  const suffix = nextChar && !/\s/.test(nextChar) ? " " : " ";
  insertTextAtCursor(`${prefix}${token}${suffix}`);
}

function clearEditor() {
  dom.chatInput.innerHTML = "";
}

function renderMessages() {
  dom.messageList.innerHTML = "";
  let previousTimestamp = null;

  state.messages.forEach((message) => {
    if (shouldRenderDivider(previousTimestamp, message.sentAt)) {
      const divider = document.createElement("p");
      divider.className = "time-divider";
      divider.textContent = formatDividerTime(message.sentAt);
      dom.messageList.appendChild(divider);
    }

    const fragment = dom.messageTemplate.content.cloneNode(true);
    const row = fragment.querySelector(".message-row");
    const avatar = fragment.querySelector(".message-avatar");
    const name = fragment.querySelector(".speaker-name");
    const quotesBox = fragment.querySelector(".message-quotes");
    const text = fragment.querySelector(".message-text");

    const roleKey =
      message.speakerId === "player" || message.speakerId === "system"
        ? message.speakerId
        : CHARACTER_REGISTRY[message.speakerId].colorKey;

    row.classList.add(roleKey);
    avatar.textContent =
      message.speakerId === "system"
        ? ""
        : message.speakerId === "player"
          ? "你"
          : CHARACTER_REGISTRY[message.speakerId].shortLabel;
    name.textContent = message.speakerName;

    if (message.quotes?.length) {
      quotesBox.classList.remove("hidden");
      quotesBox.innerHTML = message.quotes
        .map(
          (quote) => `
            <div class="message-quote">
              <span class="message-quote-speaker">${quote.speakerName}</span>
              <p class="message-quote-text">${quote.text}</p>
            </div>
          `
        )
        .join("");
    }

    text.textContent = message.text;
    dom.messageList.appendChild(fragment);
    previousTimestamp = message.sentAt;
  });

  dom.messageList.scrollTop = dom.messageList.scrollHeight;
}

function renderMembers() {
  dom.memberList.innerHTML = Object.values(CHARACTER_REGISTRY)
    .map((character) => {
      if (!character.active) {
        return `
          <article class="member-card">
            <div class="member-head">
              <h3 class="member-name">${character.name}</h3>
              <span class="planned-tag">后续开放</span>
            </div>
            <p class="member-role">${character.role}</p>
          </article>
        `;
      }

      const characterState = state.characters[character.id];
      return `
        <article class="member-card">
          <div class="member-head">
            <h3 class="member-name">${character.name}</h3>
            <span class="status-tag">${characterState.availability}</span>
          </div>
          <p class="member-role">${character.role}</p>
          <p class="member-meta">状态：${characterState.mood}</p>
          <p class="member-meta">现在在做：${characterState.currentActivity}</p>
        </article>
      `;
    })
    .join("");
}

function renderSharedMemory() {
  if (!state.sharedMemory.length) {
    dom.sharedMemoryList.innerHTML = '<p class="empty-state">还没有被明确记下的共享偏好。</p>';
    return;
  }

  dom.sharedMemoryList.innerHTML = state.sharedMemory
    .map(
      (memory) => `
        <article class="memory-card">
          <div class="memory-head">
            <p class="memory-label">${memory.label}</p>
          </div>
          <p class="memory-detail">${memory.detail}</p>
          <p class="memory-source">${memory.source}</p>
        </article>
      `
    )
    .join("");
}

function renderPrivateMemory() {
  dom.privateMemoryGrid.innerHTML = ACTIVE_CHARACTER_IDS.map((characterId) => {
    const character = CHARACTER_REGISTRY[characterId];
    const memories = state.privateMemory[characterId] ?? [];

    return `
      <article class="memory-card">
        <div class="memory-head">
          <p class="memory-label">${character.name}</p>
        </div>
        ${
          memories.length
            ? memories
                .map(
                  (memory) => `
                    <p class="memory-detail">• ${memory.detail}</p>
                  `
                )
                .join("")
            : '<p class="empty-state">暂时没有只对他/她保留的内容。</p>'
        }
      </article>
    `;
  }).join("");
}

function render() {
  renderMessages();
  renderMembers();
  renderSharedMemory();
  renderPrivateMemory();
}

function trimForMemory(text) {
  return MENTION_TOKENS.reduce((result, token) => result.replaceAll(token, ""), text)
    .replace(/^\s+/g, "")
    .replace(/^\s*先别告诉[^，,。；;：:]*[，,。；;：:]\s*/g, "")
    .replace(/^\s*别告诉[^，,。；;：:]*[，,。；;：:]\s*/g, "")
    .replace(/^\s*只和你说[，,。；;：:]\s*/g, "")
    .replace(/^\s*(记一下|记住|别忘了|以后)\s*[，,。；;：:]?\s*/g, "")
    .replace(/^[，,。；;：:\s]+/g, "")
    .trim()
    .slice(0, 80);
}

function pushSharedMemory(text) {
  const detail = trimForMemory(text);
  if (!detail) {
    return false;
  }

  if (state.sharedMemory.some((memory) => memory.detail === detail)) {
    return false;
  }

  state.sharedMemory.unshift({
    id: `shared-${currentTimestamp()}`,
    label: /喜欢|不喜欢/.test(detail) ? "偏好" : "约定",
    detail,
    source: `第 ${state.turn} 轮聊天`,
  });
  return true;
}

function pushPrivateMemory(characterId, text) {
  const detail = trimForMemory(text);
  if (!detail || !characterId) {
    return false;
  }

  const currentList = state.privateMemory[characterId] ?? [];
  if (currentList.some((memory) => memory.detail === detail)) {
    return false;
  }

  currentList.unshift({
    id: `private-${characterId}-${currentTimestamp()}`,
    detail,
  });
  state.privateMemory[characterId] = currentList.slice(0, 6);
  return true;
}

function maybeStoreMemory(text, mentionInfo, topics) {
  const privateTarget = topics.includes("secret") ? mentionInfo.ids[0] : null;
  if (privateTarget) {
    return pushPrivateMemory(privateTarget, text) ? `${CHARACTER_REGISTRY[privateTarget].name}已经单独记下。` : "";
  }

  const hasMemoryIntent = topics.includes("memory") || /喜欢|不喜欢|下次别|以后叫我/.test(text);
  if (hasMemoryIntent) {
    return pushSharedMemory(text) ? "共享记忆已更新。" : "";
  }

  return "";
}

function sharedPreferenceHint(topic) {
  if (!["meal", "health", "shopping"].includes(topic)) {
    return "";
  }

  const match = state.sharedMemory.find((memory) => /喜欢|不喜欢|别放|热汤|辣|甜/.test(memory.detail));
  return match ? `我记得你提过：${match.detail}` : "";
}

function pickMainTopic(topics) {
  const order = ["secret", "health", "rest", "meal", "commission", "shopping", "invite", "joke", "weather", "memory"];
  return order.find((topic) => topics.includes(topic)) ?? "default";
}

function detectReplyCue(text, topics, mentionInfo) {
  const cleanText = stripMentions(text);

  if (/@全体成员|@何炅|@王鸥/.test(text) && cleanText.length <= 8) {
    return "ping";
  }

  if (/[?？吗呢么麼]/.test(text) || /要不要|行不行|可以吗|在干嘛|吃什么|去哪|能不能/.test(text)) {
    return "question";
  }

  if (topics.includes("commission") && /没事|沒事|不用担心|别担心|没有危险|挺顺利|安全/.test(text)) {
    return "reassurance";
  }

  if (/我在|我刚|我已经|我准备|我先|我这边|刚忙完|刚到|路上/.test(cleanText)) {
    return "status";
  }

  if (mentionInfo.ids.length || mentionInfo.all) {
    return "direct";
  }

  return "statement";
}

function getLatestNonSystemMessage() {
  const nonSystemMessages = getNonSystemMessages();
  return nonSystemMessages.length ? nonSystemMessages[nonSystemMessages.length - 1] : null;
}

function detectFollowupTarget(sourceMessage, mentionInfo, cue) {
  if (!sourceMessage || mentionInfo.ids.length || mentionInfo.all) {
    return null;
  }

  const latestMessage = getLatestNonSystemMessage();
  if (!latestMessage || latestMessage.id === sourceMessage.id) {
    return null;
  }

  if (latestMessage.speakerId === "player" || latestMessage.speakerId === "system") {
    return null;
  }

  const sentGap = sourceMessage.sentAt - latestMessage.sentAt;
  if (sentGap > 90 * 1000) {
    return null;
  }

  if (cue === "question") {
    return latestMessage.speakerId;
  }

  if (/你/.test(stripMentions(sourceMessage.text)) && sentGap <= 45 * 1000) {
    return latestMessage.speakerId;
  }

  return null;
}

function scoreCharacter(text, topics, characterId) {
  const character = CHARACTER_REGISTRY[characterId];
  const characterState = state.characters[characterId];
  let score = characterState.availability === "忙碌" ? -2 : characterState.availability === "稍忙" ? 0 : 1;

  topics.forEach((topic) => {
    score += character.topicWeights?.[topic] ?? 0;
    (TOPIC_PATTERNS[topic] ?? []).forEach((keyword) => {
      if (text.includes(keyword)) {
        score += character.keywordWeights[keyword] ?? 1;
      }
    });
  });

  const recentGap = currentTimestamp() - (characterState.lastSpokeAt || 0);
  if (recentGap < 60 * 1000) {
    score -= 0.4;
  }

  if (/在吗|有人|谁/.test(text)) {
    score += 2;
  }

  return score;
}

function choosePrimaryResponders(text, topics, mentionInfo) {
  if (mentionInfo.all) {
    return ACTIVE_CHARACTER_IDS.map((characterId) => ({
      characterId,
      score: 999,
      mode: "direct",
    }));
  }

  if (mentionInfo.ids.length) {
    return mentionInfo.ids.map((characterId) => ({
      characterId,
      score: 999,
      mode: "direct",
    }));
  }

  const scored = ACTIVE_CHARACTER_IDS.map((characterId) => ({
    characterId,
    score: scoreCharacter(text, topics, characterId),
    mode: "direct",
  })).sort((left, right) => right.score - left.score);

  if (!scored.length || scored[0].score < 2) {
    return [];
  }

  const chosen = [scored[0]];
  if (
    scored[1] &&
    scored[1].score >= scored[0].score - 2 &&
    topics.some((topic) => ["meal", "commission", "invite", "health", "joke", "shopping"].includes(topic))
  ) {
    chosen.push(scored[1]);
  }

  return chosen;
}

function hasPendingReply(characterId, mode) {
  return state.pendingReplies.some((reply) => reply.characterId === characterId && reply.mode === mode);
}

function buildReplyTimings(characterId, sourceText, topics, mentionInfo, mode, orderIndex, score, cue = "statement", isFollowupTarget = false) {
  const seed = textSeed(`${characterId}-${sourceText}-${mode}`, orderIndex);
  const mainTopic = pickMainTopic(topics);
  const directMentioned = mentionInfo.ids.includes(characterId) || mentionInfo.all;
  const activeConversation = isConversationActive();
  let delayMs = 0;

  if (mode === "proactive") {
    delayMs = 45_000 + (seed % 90_000);
  } else if (directMentioned) {
    delayMs = 3_000 + (seed % 7_000);
    if (mentionInfo.all) {
      delayMs += orderIndex * 3_000;
    }
  } else if (mode === "direct") {
    if (isFollowupTarget && cue === "question") {
      delayMs = 2_500 + (seed % 4_500);
    } else if (isFollowupTarget || cue === "question") {
      delayMs = 4_000 + (seed % 7_000);
    } else if (activeConversation) {
      delayMs = 8_000 + (seed % 18_000);
      if (state.characters[characterId].availability === "稍忙") {
        delayMs += 10_000 + (seed % 12_000);
      }
    } else {
      delayMs = 25_000 + (seed % 55_000);
      if (score <= 3) {
        delayMs += 45_000;
      }
      if (state.characters[characterId].availability === "稍忙") {
        delayMs += 35_000 + (seed % 80_000);
      }
    }
  } else {
    if (directMentioned || activeConversation) {
      delayMs = 15_000 + (seed % 25_000);
      if (state.characters[characterId].availability === "稍忙") {
        delayMs += 12_000 + (seed % 15_000);
      }
    } else {
      delayMs = 2 * 60 * 1000 + (seed % (4 * 60 * 1000));
      if (state.characters[characterId].availability === "稍忙") {
        delayMs += 45_000 + (seed % 90_000);
      }
    }
  }

  const estimatedLength =
    mainTopic === "secret" ? 22 : mainTopic === "meal" ? 28 : mainTopic === "commission" ? 30 : 24;
  let typingMs = Math.min(18_000, 1_800 + estimatedLength * 135 + (seed % 4_500) + (directMentioned ? 900 : 0));

  if (isFollowupTarget && cue === "question") {
    typingMs = Math.max(1_200, typingMs - 1_800);
  } else if (isFollowupTarget || cue === "question") {
    typingMs = Math.max(1_500, typingMs - 900);
  }

  return {
    delayMs,
    typingMs,
  };
}

function queueReply({
  characterId,
  sourceMessage = null,
  sourceText,
  topics,
  mentionInfo,
  mode,
  orderIndex = 0,
  score = 0,
  proactiveTopic = null,
  cue = "statement",
  isFollowupTarget = false,
}) {
  if (mode === "passive" && hasPendingReply(characterId, "passive")) {
    return;
  }

  if (mode === "proactive" && hasPendingReply(characterId, "proactive")) {
    return;
  }

  if (mentionInfo.ids.includes(characterId) || mentionInfo.all) {
    state.pendingReplies = state.pendingReplies.filter(
      (reply) => !(reply.characterId === characterId && reply.mode === "passive")
    );
  }

  const now = currentTimestamp();
  const timings = buildReplyTimings(characterId, sourceText, topics, mentionInfo, mode, orderIndex, score, cue, isFollowupTarget);
  const dueAt = now + timings.delayMs;
  const readyAt = dueAt + timings.typingMs;

  state.pendingReplies.push({
    id: `pending-${characterId}-${now}-${Math.random().toString(36).slice(2, 7)}`,
    characterId,
    sourceMessageId: sourceMessage?.id ?? null,
    sourceText,
    sourceSpeakerId: sourceMessage?.speakerId ?? null,
    topics,
    mentionInfo,
    mode,
    dueAt,
    readyAt,
    typingMs: timings.typingMs,
    score,
    proactiveTopic,
    cue,
    isFollowupTarget,
  });
}

function scheduleRepliesForIncomingMessage(sourceMessage, topics, mentionInfo) {
  const cue = detectReplyCue(sourceMessage.text, topics, mentionInfo);
  const followupTarget = detectFollowupTarget(sourceMessage, mentionInfo, cue);
  const primaryResponders = choosePrimaryResponders(sourceMessage.text, topics, mentionInfo);

  primaryResponders.forEach((responder, index) => {
    queueReply({
      characterId: responder.characterId,
      sourceMessage,
      sourceText: sourceMessage.text,
      topics,
      mentionInfo,
      mode: "direct",
      orderIndex: index,
      score: responder.score,
      cue,
      isFollowupTarget: responder.characterId === followupTarget,
    });
  });

  ACTIVE_CHARACTER_IDS.filter(
    (characterId) => !primaryResponders.some((responder) => responder.characterId === characterId)
  ).forEach((characterId) => {
    if (mentionInfo.ids.includes(characterId) || mentionInfo.all) {
      return;
    }

    const score = scoreCharacter(sourceMessage.text, topics, characterId);
    const recentHumanMessages = getNonSystemMessages().slice(-4);

    if (
      score >= 3 &&
      recentHumanMessages.length >= 2 &&
      !["reassurance", "status", "ping"].includes(cue) &&
      topics.some((topic) => ["meal", "commission", "shopping", "invite", "joke", "health"].includes(topic))
    ) {
      queueReply({
        characterId,
        sourceMessage,
        sourceText: sourceMessage.text,
        topics,
        mentionInfo,
        mode: "passive",
        score,
        cue,
      });
    }
  });

  state.pendingReplies.sort((left, right) => left.readyAt - right.readyAt);
}

function chooseProactiveTopic(characterId) {
  const hour = new Date(currentTimestamp()).getHours();
  const seed = textSeed(`${characterId}-${hour}-${state.messages.length}`);
  const recentTopics = getNonSystemMessages()
    .slice(-4)
    .flatMap((message) => findTopics(message.text));

  if (recentTopics.length) {
    const recentMainTopic = pickMainTopic(recentTopics);
    if (["meal", "shopping", "invite", "rest", "weather"].includes(recentMainTopic)) {
      return recentMainTopic;
    }
  }

  if (hour >= 11 && hour <= 13) {
    return "meal";
  }

  if (hour >= 17 && hour <= 21) {
    return "meal";
  }

  if (hour >= 22 || hour <= 6) {
    return "rest";
  }

  return pickBySeed(["weather", "shopping", "invite", "rest"], seed);
}

function chooseProactiveCharacter(topic) {
  const lastMessage = getNonSystemMessages().slice(-1)[0] ?? null;
  const seed = textSeed(`${topic}-${state.messages.length}-${currentTimestamp()}`);
  const candidates = ACTIVE_CHARACTER_IDS.map((characterId) => {
    const topicScore = CHARACTER_REGISTRY[characterId].topicWeights?.[topic] ?? 0;
    const namedRecently = lastMessage?.text.includes(CHARACTER_REGISTRY[characterId].name) ? 1.4 : 0;
    const lastSpeakerPenalty = lastMessage?.speakerId === characterId ? -1.6 : 0;
    const randomBias = (Math.abs(seed + characterId.length * 13) % 7) / 10;

    return {
      characterId,
      score: topicScore + namedRecently + lastSpeakerPenalty + randomBias,
    };
  }).sort((left, right) => right.score - left.score);

  if (!candidates[1] || candidates[0].score - candidates[1].score >= 1.4) {
    return candidates[0].characterId;
  }

  return pickBySeed([candidates[0].characterId, candidates[1].characterId], seed);
}

function proactiveLineBundle(characterId, topic) {
  const seed = textSeed(`${characterId}-${topic}-${state.messages.length}`);

  if (characterId === "he_jiong") {
    switch (topic) {
      case "meal":
        return chooseBundle(characterId, [
          ["我刚路过东市，闻到热汤味了。", "你今晚要是还没吃，别再往后拖。"],
          ["我这边手上的事差不多收尾了。", "你晚饭记得吃一点热的。"],
          ["刚闲下来就想到你们晚饭还没定。", "要不要我先替你们看个地方。"],
        ], seed);
      case "weather":
        return chooseBundle(characterId, [
          ["外面风比刚才大一点。", "你要是还在路上，记得走慢些。"],
          ["天色压下来了。", "你要出门的话，最好别走太急。"],
        ], seed);
      case "invite":
        return chooseBundle(characterId, [
          ["我等会儿会路过承务所那边。", "你要是正好也在附近，可以一起走一段。"],
          ["我待会儿要往东边去。", "你如果顺路，可以直接叫我一声。"],
        ], seed);
      case "shopping":
        return chooseBundle(characterId, [
          ["东市还有几家铺子没关。", "你之前要是还有东西想买，现在去还来得及。"],
          ["我刚看见前街还有灯。", "你要补什么，现在动身还不算迟。"],
        ], seed);
      default:
        return chooseBundle(characterId, [
          ["你今天忙到现在了。", "要是能歇一会儿，就先歇一会儿。"],
          ["我这边刚松口气。", "你要是还没停下来，也给自己留点空。"],
        ], seed);
    }
  }

  switch (topic) {
    case "meal":
      return chooseBundle(characterId, [
        ["我刚把药材收好。", "你晚饭别又随便对付。"],
        ["我这边忙完一阵了。", "你要是还没吃，先去找点热的。"],
        ["我这会儿终于腾出手。", "你们要是还没定晚饭，我能帮着缩一下范围。"],
      ], seed);
    case "weather":
      return chooseBundle(characterId, [
        ["外面这会儿有点闷。", "你要是准备出门，最好先带伞。"],
        ["风里有潮气。", "如果晚点还在外面，别穿得太单薄。"],
      ], seed);
    case "invite":
      return chooseBundle(characterId, [
        ["我等会儿会去一趟药铺后街。", "你要是顺路，可以一起过来。"],
        ["我晚些时候要出去一趟。", "你要是在附近，直接碰头也行。"],
      ], seed);
    case "shopping":
      return chooseBundle(characterId, [
        ["西边那排铺子今天关得不算早。", "你之前要买的东西，现在去还赶得上。"],
        ["我刚从那边回来。", "真要补东西，现在还是个合适的时候。"],
      ], seed);
    default:
      return chooseBundle(characterId, [
        ["你今天一直没怎么停。", "要是现在能坐下，就先让自己缓一缓。"],
        ["忙到这会儿差不多该松一口气了。", "别把自己绷得太满。"],
      ], seed);
  }
}

function ensureProactiveReplyScheduled() {
  if (state.pendingReplies.some((reply) => reply.mode !== "proactive")) {
    return;
  }

  if (state.pendingReplies.some((reply) => reply.mode === "proactive")) {
    return;
  }

  const lastActivityAt = getLatestActivityTimestamp();
  if (!lastActivityAt || currentTimestamp() - lastActivityAt < PROACTIVE_IDLE_MS) {
    return;
  }

  const topic = chooseProactiveTopic("proactive");
  const chosenCharacterId = chooseProactiveCharacter(topic);
  const mentionInfo = { all: false, ids: [] };

  queueReply({
    characterId: chosenCharacterId,
    sourceText: topic,
    topics: [topic],
    mentionInfo,
    mode: "proactive",
    proactiveTopic: topic,
  });
}

function getBacklogMessages(characterId, replyReadyAt) {
  const characterState = state.characters[characterId];
  return state.messages.filter((message) => {
    if (message.speakerId === "system" || message.speakerId === characterId) {
      return false;
    }

    return message.sentAt > (characterState.lastReadAt || 0) && message.sentAt <= replyReadyAt;
  });
}

function pickQuotedMessages(characterId, pendingReply) {
  if (pendingReply.mode === "proactive") {
    return [];
  }

  const backlog = getBacklogMessages(characterId, pendingReply.readyAt);
  if (!backlog.length) {
    return [];
  }

  const sourceMessage = state.messages.find((message) => message.id === pendingReply.sourceMessageId);
  const sourceTopics = pendingReply.topics ?? [];

  const candidates = backlog
    .filter((message) => message.speakerId !== characterId && message.speakerId !== "system")
    .map((message) => {
      const cleanText = stripMentions(message.text);
      const messageTopics = findTopics(cleanText);
      const sharedTopicCount = messageTopics.filter((topic) => sourceTopics.includes(topic)).length;
      const recencyScore = Math.max(0, 10 - Math.floor((pendingReply.readyAt - message.sentAt) / 60000));
      const sourceBonus = sourceMessage && message.id === sourceMessage.id ? 5 : 0;
      const playerBonus = message.speakerId === "player" ? 1.5 : 0;
      const lengthPenalty = cleanText.length <= 3 ? 7 : cleanText.length <= 6 ? 2.5 : 0;
      const mentionOnlyPenalty = cleanText.length <= 4 && /@/.test(message.text) ? 4 : 0;

      return {
        message,
        cleanText,
        score: sharedTopicCount * 5 + recencyScore + sourceBonus + playerBonus - lengthPenalty - mentionOnlyPenalty,
      };
    })
    .filter((candidate) => candidate.cleanText.length > 0)
    .sort((left, right) => right.score - left.score);

  const best = candidates[0];
  if (!best || best.score <= 0) {
    return [];
  }

  return [
    {
      speakerName: best.message.speakerName,
      text: excerptText(best.cleanText),
    },
  ];
}

function getRecentSpeakerBefore(timestamp, characterId) {
  const recent = [...state.messages]
    .filter((message) => message.sentAt <= timestamp && message.speakerId !== "system" && message.speakerId !== characterId)
    .sort((left, right) => right.sentAt - left.sentAt);

  return recent[0]?.speakerId ?? null;
}

function normalizeComparableText(text) {
  return stripMentions(text)
    .replace(/[\s，。、“”‘’！？：；,.!?:;~\-—]/g, "")
    .trim();
}

function textBigrams(text) {
  const normalized = normalizeComparableText(text);
  if (normalized.length <= 1) {
    return normalized ? [normalized] : [];
  }

  const result = [];
  for (let index = 0; index < normalized.length - 1; index += 1) {
    result.push(normalized.slice(index, index + 2));
  }
  return result;
}

function similarityScore(left, right) {
  const leftNormalized = normalizeComparableText(left);
  const rightNormalized = normalizeComparableText(right);

  if (!leftNormalized || !rightNormalized) {
    return 0;
  }

  if (leftNormalized === rightNormalized) {
    return 1;
  }

  if (leftNormalized.includes(rightNormalized) || rightNormalized.includes(leftNormalized)) {
    return 0.86;
  }

  const leftSet = new Set(textBigrams(leftNormalized));
  const rightSet = new Set(textBigrams(rightNormalized));
  if (!leftSet.size || !rightSet.size) {
    return 0;
  }

  let overlap = 0;
  leftSet.forEach((item) => {
    if (rightSet.has(item)) {
      overlap += 1;
    }
  });

  return overlap / Math.max(leftSet.size, rightSet.size);
}

function getRecentDialogueSamples(characterId, limit = 10) {
  return [...state.messages]
    .filter((message) => message.speakerId !== "system")
    .sort((left, right) => right.sentAt - left.sentAt)
    .slice(0, limit)
    .map((message) => ({
      sameSpeaker: message.speakerId === characterId,
      text: message.text,
    }));
}

function bundleSimilarityPenalty(characterId, lines) {
  const candidateText = lines.join("\n");
  const recentSamples = getRecentDialogueSamples(characterId);

  return recentSamples.reduce((highest, sample) => {
    const similarity = similarityScore(candidateText, sample.text);
    return Math.max(highest, sample.sameSpeaker ? similarity : similarity * 0.92);
  }, 0);
}

function chooseBundle(characterId, options, seed) {
  if (!options.length) {
    return [];
  }

  const ranked = options
    .map((lines, index) => ({
      lines,
      penalty: bundleSimilarityPenalty(characterId, lines),
      order: Math.abs(seed + index * 17) % options.length,
    }))
    .sort((left, right) => {
      if (left.penalty !== right.penalty) {
        return left.penalty - right.penalty;
      }

      return left.order - right.order;
    });

  return ranked[0].lines;
}

function lineBundle(characterId, topic, text, priorSpeakerId, cue = "statement") {
  const seed = textSeed(text, characterId.length + state.messages.length);
  const preferenceHint = sharedPreferenceHint(topic);
  const cleanText = stripMentions(text);
  const isShortCall = cleanText.length <= 6;

  if (characterId === "he_jiong") {
    switch (topic) {
      case "secret":
        return chooseBundle(characterId, [
          ["好，我单独记着。", "你想什么时候告诉她，都由你自己决定。"],
          ["行，这句先留在我这里。", "等你点头之前，我不会往外递。"],
        ], seed);
      case "commission":
        if (cue === "reassurance") {
          return chooseBundle(characterId, [
            ["知道，不危险就好。", "真要有变数，记得立刻在群里说一声。"],
            ["那我先放心一半。", "你既然说没事，我就不抢着替你下判断。"],
            ["行，你心里有数就好。", "收尾以后再告诉我们结果。"],
          ], seed);
        }
        return chooseBundle(characterId, [
          ["今天的委托不算挤，麻烦在细碎。", "你要是想挑个轻一点的，我先替你筛一遍。"],
          ["承务所这边还算平静，都是零碎活。", "真要接的话，我先帮你把风险高的那几项划掉。"],
          ["委托能接，但别急着一口答应。", "你先说想碰哪一类，我再按路子给你看。"],
        ], seed);
      case "meal":
        return chooseBundle(characterId, [
          ["我正好也想到晚饭了。", preferenceHint || "东市这会儿多半有热汤和刚出锅的点心。"],
          ["你这句来得巧，我刚准备收尾。", preferenceHint || "要是真去吃，我倾向挑个离你近的地方。"],
          priorSpeakerId === "wang_ou"
            ? ["她都说到热的了，那今晚就别再随便对付。", preferenceHint || "你定个方向，我过去接话。"]
            : ["先把吃饭定下来也行。", preferenceHint || "你想吃面、汤还是清淡一点的，我都能陪你挑。"],
        ], seed);
      case "health":
      case "rest":
        return chooseBundle(characterId, [
          ["先别硬撑。", "你现在哪里不舒服，直接说清楚一点。"],
          ["慢一点。", "真不舒服就别拿一句“没事”糊弄过去。"],
          priorSpeakerId === "wang_ou"
            ? ["她看这种事比我准。", "我这边只补一句：先别逞强。"]
            : ["要继续赶路也行。", "但得先把状态稳住再说。"],
        ], seed);
      case "shopping":
        return chooseBundle(characterId, [
          ["要买东西的话，现在出门还不算晚。", "我能顺路替你看哪几家还开着。"],
          ["真要逛铺子，东市还来得及。", "你先说是图方便还是图省心。"],
          ["你要买什么先给我个范围。", "我好替你判断值不值得专门跑一趟。"],
        ], seed);
      case "invite":
        return chooseBundle(characterId, [
          ["可以，我这边能挪出时间。", "你先定个大概地方，我路上再回你。"],
          ["行，我能去。", "你把时间和方向发来，我好估路程。"],
          ["我这边问题不大。", "只要别卡得太紧，我都接得上。"],
        ], seed);
      case "joke":
        return chooseBundle(characterId, [
          ["你这句挺会挑时候，我差点就信了。"],
          ["行，这话我先记下。", "听着像认真，又像故意逗人。"],
          ["你这样一说，我还真停下来想了一下。"],
        ], seed);
      default:
        if (cue === "status") {
          return chooseBundle(characterId, [["知道了。"], ["收到。"], ["好，我记下了。"]], seed);
        }
        if (cue === "ping") {
          return chooseBundle(characterId, [["我在。"], ["在。"], ["嗯，我看见了。"]], seed);
        }
        return chooseBundle(characterId,
          isShortCall
            ? [["我在。"], ["看见了。"], ["嗯，我在这边。"]]
            : [["我在，你继续说。"], ["看见了，你往下说。"], ["我这边听着呢。"]],
          seed
        );
    }
  }

  switch (topic) {
    case "secret":
      return chooseBundle(characterId, [
        ["我知道了，这句话我不会替你往外说。"],
        ["行，我先替你把这句压住。"],
      ], seed);
    case "commission":
      if (cue === "reassurance") {
        return chooseBundle(characterId, [
          ["那就好。", "你既然已经判断过不危险，我这边就不多念了。"],
          ["知道了。", "你自己心里有数的话，我先按没事算。"],
          ["好。", "等你忙完再慢慢说。"],
        ], seed);
      }
      return chooseBundle(characterId, [
        ["委托能接，但准备别省。", priorSpeakerId === "he_jiong" ? "他会先替你筛一遍，我补一句：药和换洗也算准备。" : "尤其是路远、潮湿或者要过夜的差事。"],
        ["要接委托可以。", "前提是别把最基本的判断也一起省掉。"],
        ["你如果真打算去，我更关心你带没带够东西。"],
      ], seed);
    case "meal":
      return chooseBundle(characterId, [
        ["先把晚饭定下来。", preferenceHint || "你要想喝热的，我这边能给出几个稳妥选择。"],
        ["我不和你们争“先吃饭”这件事。", preferenceHint || "你只说想吃清淡、热汤还是点心，我来缩范围。"],
        priorSpeakerId === "he_jiong"
          ? ["何炅既然已经应下了，我这边就不再催第二遍。", preferenceHint || "我更想知道你今晚想吃什么口味。"]
          : ["晚饭别再拖。", preferenceHint || "饿着的时候聊什么都容易变味。"],
      ], seed);
    case "health":
    case "rest":
      return chooseBundle(characterId, [
        ["要是不舒服，就先把症状说清楚。", priorSpeakerId === "he_jiong" ? "他负责劝，你负责照做。" : "淋雨、发热、伤口发胀，这几样都别拖。"],
        ["先别透支精神。", "身体不会因为你嘴硬就变好。"],
        ["你先停一下。", "让我判断这是累、冷着了，还是已经到需要处理的程度。"],
      ], seed);
    case "shopping":
      return chooseBundle(characterId, [
        ["要买药材的话，西边那排铺子更稳一点。", "如果只是带点心，路线倒不用绕得太复杂。"],
        ["真要挑东西，先想清楚你是图方便还是图省心。"],
        ["你把要买的东西说具体些。", "我好判断值不值得专门跑。"],
      ], seed);
    case "invite":
      return chooseBundle(characterId, [
        ["我可以去，不过会比何炅晚一点。", "你定时间时给自己留点空，不要卡得太紧。"],
        ["能去，不过我要先把手上的事收尾。"],
        ["可以。", "但别把行程挤得太满。"],
      ], seed);
    case "joke":
      return chooseBundle(characterId, [
        ["你倒是挺会说。", priorSpeakerId === "he_jiong" ? "别看他笑得温和，回头还是会记住你刚才那句。" : "这句至少比我今天听到的那些讨价还价顺耳。"],
        ["这句有点意思。"],
        ["你这话放群里，确实会让人多看一眼。"],
      ], seed);
    default:
      if (cue === "status") {
        return chooseBundle(characterId, [["好。"], ["知道了。"], ["收到。"]], seed);
      }
      if (cue === "ping") {
        return chooseBundle(characterId, [["在。"], ["我看见了。"], ["嗯，收到。"]], seed);
      }
      return chooseBundle(characterId,
        isShortCall
          ? [["在。"], ["我看见了。"], ["嗯，收到。"]]
          : [["我看见了，你继续说。"], ["我这边听着。"], ["嗯，你往下说。"]],
        seed
      );
  }
}

function updateCharacterStateAfterReply(characterId, topics, sentAt, linesLength) {
  const characterState = state.characters[characterId];
  characterState.lastSpokeAt = sentAt;
  characterState.lastReadAt = sentAt;

  if (topics.includes("commission")) {
    characterState.currentActivity =
      characterId === "he_jiong"
        ? "翻着今天的委托记录，顺手替你留意能做的差事"
        : "在想哪些准备不能省，顺便核对药包里缺的东西";
    characterState.availability = "空闲";
  } else if (topics.includes("meal")) {
    characterState.currentActivity =
      characterId === "he_jiong" ? "开始认真考虑今晚吃什么" : "顺手把和吃饭有关的安排也算进时间里";
    characterState.availability = "空闲";
  } else if (topics.includes("health") || topics.includes("rest")) {
    characterState.currentActivity =
      characterId === "he_jiong" ? "把注意力分到你这边，听你说得有没有勉强" : "下意识开始判断你现在需不需要休息和处理";
    characterState.availability = "空闲";
  } else if (topics.includes("shopping")) {
    characterState.currentActivity =
      characterId === "he_jiong" ? "顺路想着东市那边还开什么铺子" : "开始在心里筛哪些铺子今天值得去";
  } else if (topics.includes("invite")) {
    characterState.currentActivity =
      characterId === "he_jiong" ? "估算碰头时间和路程" : "把自己的事排开一点，准备腾出空";
  } else if (linesLength > 1) {
    characterState.currentActivity =
      characterId === "he_jiong" ? "接上了话题，语气明显放松些" : "继续顺着话题往下聊，但还保持着分寸";
  }
}

function finalizePendingReply(pendingReply) {
  const characterId = pendingReply.characterId;
  const sentAt = pendingReply.readyAt;
  let lines = [];
  let quotes = [];
  let topics = pendingReply.topics ?? [];

  if (pendingReply.mode === "proactive") {
    lines = proactiveLineBundle(characterId, pendingReply.proactiveTopic ?? pickMainTopic(topics));
  } else {
    quotes = pickQuotedMessages(characterId, pendingReply);
    const previousSpeakerId = getRecentSpeakerBefore(pendingReply.readyAt, characterId);
    lines = lineBundle(characterId, pickMainTopic(topics), pendingReply.sourceText, previousSpeakerId, pendingReply.cue);
  }

  appendMessage(
    createMessage(characterId, lines.join("\n"), {
      sentAt,
      quotes,
    })
  );

  updateCharacterStateAfterReply(characterId, topics, sentAt, lines.length);
}

function processPendingReplies() {
  let changed = false;
  const now = currentTimestamp();

  state.pendingReplies.sort((left, right) => left.readyAt - right.readyAt);
  const readyReplies = state.pendingReplies.filter((reply) => now >= reply.readyAt);

  if (!readyReplies.length) {
    return false;
  }

  readyReplies.forEach((reply) => {
    finalizePendingReply(reply);
    changed = true;
  });

  const readyIds = new Set(readyReplies.map((reply) => reply.id));
  state.pendingReplies = state.pendingReplies.filter((reply) => !readyIds.has(reply.id));
  return changed;
}

function updateTypingIndicator() {
  const now = currentTimestamp();
  const activeTyping = state.pendingReplies
    .filter((reply) => now >= reply.dueAt && now < reply.readyAt)
    .sort((left, right) => left.dueAt - right.dueAt || left.readyAt - right.readyAt);

  const nextSignature = activeTyping.map((reply) => `${reply.characterId}-${reply.readyAt}`).join("|");
  if (nextSignature === lastTypingSignature) {
    return;
  }

  lastTypingSignature = nextSignature;
  if (!activeTyping.length) {
    dom.typingRow.classList.add("hidden");
    dom.typingList.innerHTML = "";
    return;
  }

  dom.typingList.innerHTML = activeTyping
    .map((reply) => {
      const name = CHARACTER_REGISTRY[reply.characterId].name;
      return `
        <div class="typing-item">
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
          <span class="typing-text">${name}正在输入…</span>
        </div>
      `;
    })
    .join("");
  dom.typingRow.classList.remove("hidden");
}

function tickRuntime() {
  ensureProactiveReplyScheduled();
  const changed = processPendingReplies();
  updateTypingIndicator();

  if (changed) {
    render();
    saveState("有人刚刚回了消息");
  }
}

function startRuntime() {
  if (runtimeIntervalId) {
    window.clearInterval(runtimeIntervalId);
  }

  tickRuntime();
  runtimeIntervalId = window.setInterval(tickRuntime, TICK_INTERVAL_MS);
}

function exportState() {
  const payload = {
    exportedAt: new Date().toISOString(),
    storageKey: STORAGE_KEY,
    data: state,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "大侦探群聊记录.json";
  link.click();
  URL.revokeObjectURL(url);
}

function resetState() {
  const confirmed = window.confirm("确定清空当前群聊吗？这会删除本地浏览器里的群聊记录与记忆。");
  if (!confirmed) {
    return;
  }

  state = makeDefaultState();
  clearEditor();
  render();
  saveState("已重置群聊");
  updateTypingIndicator();
}

async function handleSend(event) {
  event.preventDefault();
  const raw = getEditorText().trim();

  if (!raw) {
    return;
  }

  const immediatelyChanged = processPendingReplies();
  if (immediatelyChanged) {
    render();
  }

  state.turn += 1;
  const playerMessage = createMessage("player", raw);
  appendMessage(playerMessage);

  const topics = findTopics(raw);
  const mentionInfo = parseMentions(raw);
  const memoryNote = maybeStoreMemory(raw, mentionInfo, topics);
  scheduleRepliesForIncomingMessage(playerMessage, topics, mentionInfo);
  clearEditor();

  render();
  updateTypingIndicator();
  saveState(memoryNote || "消息已发送，等待群里的人看到");
}

function handleEditorInput() {
  if (isComposing) {
    return;
  }
  syncEditorMarkup();
}

function handleEditorKeydown(event) {
  if (isComposing) {
    return;
  }

  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    dom.composer.requestSubmit();
  }
}

function bindEvents() {
  dom.composer.addEventListener("submit", handleSend);
  dom.chatInput.addEventListener("input", handleEditorInput);
  dom.chatInput.addEventListener("keydown", handleEditorKeydown);
  dom.chatInput.addEventListener("compositionstart", () => {
    isComposing = true;
  });
  dom.chatInput.addEventListener("compositionend", () => {
    isComposing = false;
    syncEditorMarkup();
  });
  dom.chatInput.addEventListener("paste", (event) => {
    event.preventDefault();
    const pastedText = event.clipboardData?.getData("text/plain") ?? "";
    insertTextAtCursor(pastedText);
  });

  dom.quickMentionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const token = button.dataset.mention ?? "";
      if (token) {
        insertMentionToken(token);
      }
    });
  });

  dom.resetButton.addEventListener("click", resetState);
  dom.exportButton.addEventListener("click", exportState);
}

bindEvents();
render();
saveState();
startRuntime();
