function parseMaybeJson(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function toBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', 't', '1', 'yes', 'y'].includes(normalized)) return true;
    if (['false', 'f', '0', 'no', 'n', ''].includes(normalized)) return false;
  }
  return fallback;
}

function toNumber(value, fallback = null) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function looksLikeUrl(value) {
  return (
    typeof value === 'string' &&
    (/^https?:\/\//i.test(value) || value.startsWith('/') || value.startsWith('data:image/'))
  );
}

function normalizeDropGroups(groups) {
  const list = Array.isArray(groups) ? groups : [];
  return list.map((group, index) => {
    const raw = typeof group === 'object' && group !== null ? group : { label: String(group) };
    return {
      ...raw,
      id: raw.id ?? `group_${index + 1}`,
      label: raw.label ?? raw.name ?? `Group ${index + 1}`,
    };
  });
}

function normalizeDragItems(items, dropGroups) {
  const list = Array.isArray(items) ? items : [];
  const validGroupIds = new Set(dropGroups.map((g) => String(g.id)));

  return list.map((item, index) => {
    const raw = typeof item === 'object' && item !== null ? item : { content: String(item) };
    const rawTarget =
      raw.targetGroupId ??
      raw.target_group_id ??
      raw.groupId ??
      raw.group_id ??
      null;

    const normalizedTarget =
      rawTarget != null && validGroupIds.has(String(rawTarget)) ? String(rawTarget) : null;

    const content = raw.content ?? raw.label ?? '';
    const imageUrl = raw.imageUrl ?? raw.image_url ?? (looksLikeUrl(content) ? content : null);

    return {
      ...raw,
      id: raw.id ?? `drag_item_${index + 1}`,
      content,
      imageUrl,
      targetGroupId: normalizedTarget,
    };
  });
}

function normalizeSortingItems(items) {
  const list = Array.isArray(items) ? items : [];
  return list.map((item, index) => {
    const raw = typeof item === 'object' && item !== null ? item : { content: String(item) };
    return {
      ...raw,
      id: raw.id ?? `sort_item_${index + 1}`,
      content: raw.content ?? raw.label ?? '',
      correctPosition: toNumber(raw.correctPosition ?? raw.correct_position, index),
    };
  });
}

function normalizePart(part) {
  const raw = typeof part === 'object' && part !== null ? part : { type: 'text', content: String(part ?? '') };
  const normalized = {
    ...raw,
    type: raw.type ?? 'text',
    isVertical: toBoolean(raw.isVertical ?? raw.is_vertical, false),
  };

  if (Array.isArray(raw.children)) {
    normalized.children = raw.children.map(normalizePart);
  }

  return normalized;
}

function normalizeParts(parts) {
  const list = Array.isArray(parts) ? parts : [];
  return list.map(normalizePart);
}

function normalizeQuestionType(value) {
  const raw = String(value ?? '').trim();
  const lowered = raw.toLowerCase();

  const aliases = {
    fillintheblank: 'fillInTheBlank',
    fill_in_the_blank: 'fillInTheBlank',
    'fill-in-the-blank': 'fillInTheBlank',
    imagechoice: 'imageChoice',
    image_choice: 'imageChoice',
    textinput: 'textInput',
    text_input: 'textInput',
    draganddrop: 'dragAndDrop',
    drag_and_drop: 'dragAndDrop',
    fourpicsoneword: 'fourPicsOneWord',
    four_pics_one_word: 'fourPicsOneWord',
    'four-pics-one-word': 'fourPicsOneWord',
    measure: 'measure',
    sorting: 'sorting',
    mcq: 'mcq',
  };

  if (aliases[lowered]) return aliases[lowered];
  return raw;
}

export function mapDbQuestion(row) {
  const parsedOptions = parseMaybeJson(row.options, []);
  const parsedItems = parseMaybeJson(row.items, []);
  const sortingSource =
    row.type === 'sorting' && (!Array.isArray(parsedItems) || parsedItems.length === 0)
      ? parsedOptions
      : parsedItems;

  const dropGroups = normalizeDropGroups(
    parseMaybeJson(row.drop_groups ?? row.drag_groups ?? row.dropGroups, [])
  );
  const dragItems = normalizeDragItems(
    parseMaybeJson(row.drag_items ?? row.dragItems, []),
    dropGroups
  );
  const items = normalizeSortingItems(sortingSource);

  return {
    id: row.id,
    microSkillId: row.micro_skill_id ?? row.microskill_id ?? null,
    type: normalizeQuestionType(row.type),
    parts: normalizeParts(parseMaybeJson(row.parts, [])),
    options: parsedOptions,
    items,
    dragItems,
    dropGroups,
    correctAnswerIndex: toNumber(row.correct_answer_index ?? row.correctAnswerIndex, null),
    correctAnswerIndices: parseMaybeJson(row.correct_answer_indices ?? row.correctAnswerIndices, []),
    correctAnswerText: row.correct_answer_text ?? row.correctAnswerText ?? '',
    solution: row.solution ?? '',
    difficulty: row.difficulty ?? 'easy',
    marks: toNumber(row.marks, 1),
    complexity: toNumber(row.complexity, 0),
    adaptiveConfig: parseMaybeJson(row.adaptive_config ?? row.adaptiveConfig, null),
    isMultiSelect: toBoolean(row.is_multi_select ?? row.isMultiSelect, false),
    isVertical: toBoolean(row.is_vertical ?? row.isVertical, false),
    showSubmitButton: toBoolean(row.show_submit_button ?? row.showSubmitButton, true),
    sortOrder: toNumber(row.sort_order ?? row.sortOrder ?? row.idx, 0),
  };
}
