type WorkspaceSummaryInput = {
  hasBio: boolean;
  skillsCount: number;
  projectsCount: number;
};

type WorkspaceSummaryCard = {
  title: string;
  caption: string;
};

type WorkspaceSummary = {
  completionRatio: number;
  completionLabel: string;
  cards: WorkspaceSummaryCard[];
};

function pluralize(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return one;
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return few;
  }

  return many;
}

export function getWorkspaceSummary(input: WorkspaceSummaryInput): WorkspaceSummary {
  const checkpoints = [
    input.hasBio,
    input.skillsCount > 0,
    input.projectsCount > 0,
  ];
  const completedCount = checkpoints.filter(Boolean).length;
  const completionRatio = Math.round((completedCount / checkpoints.length) * 100);

  const completionLabel =
    completedCount === 0
      ? "Профиль только создан"
      : completedCount === checkpoints.length
        ? "Профиль готов к поиску"
        : "Профиль заполнен частично";

  return {
    completionRatio,
    completionLabel,
    cards: [
      {
        title: `${input.skillsCount} ${pluralize(input.skillsCount, "навык", "навыка", "навыков")}`,
        caption: input.skillsCount > 0 ? "Сильнее сигнал для мэтчинга" : "Добавьте хотя бы один ключевой навык",
      },
      {
        title: `${input.projectsCount} ${pluralize(input.projectsCount, "проект", "проекта", "проектов")}`,
        caption: input.projectsCount > 0 ? "Есть что показать команде" : "Создайте первый проект для ленты",
      },
      {
        title: input.hasBio ? "Описание заполнено" : "Описание пустое",
        caption: input.hasBio ? "Профиль выглядит живым и понятным" : "Короткое био повышает отклик и контекст",
      },
    ],
  };
}
