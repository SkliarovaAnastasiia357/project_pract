export type HomeTaskTone = "blue" | "orange" | "rose" | "green";

export type HomeTask = {
  id: string;
  title: string;
  description: string;
  dateLabel: string;
  assignee: string;
  tone: HomeTaskTone;
};

export type HomeTaskColumn = {
  id: "planned" | "inWork" | "review" | "done";
  title: string;
  accent: "soft" | "neutral";
  tasks: HomeTask[];
};

export function buildHomeTaskBoard(): HomeTaskColumn[] {
  return [
    {
      id: "planned",
      title: "Внешняя проверка",
      accent: "soft",
      tasks: [
        {
          id: "hosting-release",
          title: "Проверка хостинга",
          description: "Подтвердить DNS, /healthz, /readyz и SPA fallback после доступа к стенду.",
          dateLabel: "30.05.2026",
          assignee: "T3",
          tone: "rose",
        },
      ],
    },
    {
      id: "inWork",
      title: "Финальный gate",
      accent: "neutral",
      tasks: [
        {
          id: "qa-pass",
          title: "Автоматические проверки",
          description: "Повторить frontend, backend, build, backend build, lint и db generate.",
          dateLabel: "30.05.2026",
          assignee: "CA",
          tone: "blue",
        },
        {
          id: "manual-mvp-cycle",
          title: "Ручной MVP-cycle",
          description: "Пройти owner/member сценарий на desktop и mobile viewport.",
          dateLabel: "30.05.2026",
          assignee: "MM",
          tone: "blue",
        },
      ],
    },
    {
      id: "review",
      title: "Готово к сдаче",
      accent: "neutral",
      tasks: [
        {
          id: "purple-ui",
          title: "Темный Teamnova UI",
          description: "Маршруты приведены к фиолетовой системе и проверены на desktop/mobile.",
          dateLabel: "30.05.2026",
          assignee: "MM",
          tone: "blue",
        },
        {
          id: "final-presentation",
          title: "Презентация 10 слайдов",
          description: "PPTX integrity проверен, факты синхронизированы с README и кодом.",
          dateLabel: "30.05.2026",
          assignee: "CA",
          tone: "blue",
        },
      ],
    },
    {
      id: "done",
      title: "Сделано",
      accent: "neutral",
      tasks: [
        {
          id: "sprint4-mvp",
          title: "MVP Спринта 4",
          description: "Авторизация, профиль, проекты, поиск и заявки готовы к финальному QA.",
          dateLabel: "14.05.2026",
          assignee: "ALL",
          tone: "green",
        },
        {
          id: "session-restore",
          title: "Восстановление сессии",
          description: "Protected routes сохраняют mock-сессию после прямого перехода и refresh.",
          dateLabel: "28.05.2026",
          assignee: "CA",
          tone: "green",
        },
        {
          id: "docs-update",
          title: "Финальная документация",
          description: "README, status, test-plan и release checklist описывают текущую сдачу.",
          dateLabel: "30.05.2026",
          assignee: "CA",
          tone: "green",
        },
        {
          id: "board-layout",
          title: "Responsive board",
          description: "Доска задач больше не обрезается на desktop и mobile.",
          dateLabel: "30.05.2026",
          assignee: "MM",
          tone: "green",
        },
      ],
    },
  ];
}
