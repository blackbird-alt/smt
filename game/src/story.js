// Story state machine: arbitrary flags + a quest log.
// Flags gate dialogue/content. Quests track objectives.

export function createStory(serialized) {
  const flags = serialized?.flags ? { ...serialized.flags } : {};
  const quests = serialized?.quests ? structuredCloneSafe(serialized.quests) : {};

  return {
    flags,
    quests,

    get(flag) {
      return flags[flag];
    },
    set(flag, value = true) {
      flags[flag] = value;
    },
    is(flag, value = true) {
      return flags[flag] === value;
    },
    inc(flag, by = 1) {
      flags[flag] = (flags[flag] || 0) + by;
      return flags[flag];
    },

    // ---- Quests ----
    // questDef: { id, name, desc, objectives:[{id,text}], ... } from content
    startQuest(def) {
      if (quests[def.id]) return;
      quests[def.id] = {
        id: def.id,
        name: def.name,
        desc: def.desc,
        status: "active", // active | done
        objectives: def.objectives.map((o) => ({
          id: o.id,
          text: o.text,
          done: false,
        })),
      };
    },
    hasQuest(id) {
      return !!quests[id];
    },
    questStatus(id) {
      return quests[id]?.status;
    },
    completeObjective(questId, objId) {
      const q = quests[questId];
      if (!q) return;
      const o = q.objectives.find((x) => x.id === objId);
      if (o) o.done = true;
    },
    completeQuest(id) {
      if (quests[id]) quests[id].status = "done";
    },
    activeQuests() {
      return Object.values(quests).filter((q) => q.status === "active");
    },
    allQuests() {
      return Object.values(quests);
    },

    serialize() {
      return { flags: { ...flags }, quests: structuredCloneSafe(quests) };
    },
  };
}

function structuredCloneSafe(obj) {
  return JSON.parse(JSON.stringify(obj));
}
