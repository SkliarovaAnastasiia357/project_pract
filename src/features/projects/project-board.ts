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
      title: "Запланировано",
      accent: "soft",
      tasks: [
        {
          id: "final-presentation",
          title: "Финальная презентация",
          description: "Собрать историю продукта, архитектуру, QA и итоги MVP.",
          dateLabel: "22.05.2026",
          assignee: "CA",
          tone: "blue",
        },
        {
          id: "hosting-release",
          title: "Публикация на хостинге",
          description: "Проверить сборку, домен, health endpoints и release checklist.",
          dateLabel: "24.05.2026",
          assignee: "T3",
          tone: "rose",
        },
      ],
    },
    {
      id: "inWork",
      title: "В работе",
      accent: "neutral",
      tasks: [
        {
          id: "qa-pass",
          title: "Комплексное тестирование",
          description: "Прогнать frontend, backend, build, lint и browser smoke.",
          dateLabel: "16.05.2026",
          assignee: "CA",
          tone: "blue",
        },
        {
          id: "bugfixes",
          title: "Исправление багов",
          description: "Закрыть найденные дефекты, влияющие на демо и защиту.",
          dateLabel: "17.05.2026",
          assignee: "MM",
          tone: "orange",
        },
        {
          id: "ui-ux-polish",
          title: "UI/UX полировка",
          description: "Обновить финальные тексты, статусы и ключевые экраны.",
          dateLabel: "18.05.2026",
          assignee: "MM",
          tone: "blue",
        },
        {
          id: "docs-update",
          title: "Документация",
          description: "Синхронизировать README, тест-план, чек-листы и сценарий защиты.",
          dateLabel: "20.05.2026",
          assignee: "CA",
          tone: "green",
        },
      ],
    },
    {
      id: "review",
      title: "На проверке",
      accent: "neutral",
      tasks: [
        {
          id: "release-build-review",
          title: "Проверка релизной сборки",
          description: "Подтвердить production build и отсутствие регрессий.",
          dateLabel: "25.05.2026",
          assignee: "T3",
          tone: "blue",
        },
        {
          id: "production-pr",
          title: "PR в прод",
          description: "Commit, push и draft PR в production-ready ветку.",
          dateLabel: "26.05.2026",
          assignee: "MM",
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
      ],
    },
  ];
}
