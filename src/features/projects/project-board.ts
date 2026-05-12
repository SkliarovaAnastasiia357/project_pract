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
          id: "checklist-testcases",
          title: "чек-лист / тест-кейсы",
          description: "Подготовить проверку сценариев показа.",
          dateLabel: "10.05.2026",
          assignee: "CA",
          tone: "blue",
        },
        {
          id: "page-component-mockups",
          title: "Макеты страниц, компонентов",
          description: "Сверить основные экраны и элементы интерфейса.",
          dateLabel: "07.05.2026",
          assignee: "PM",
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
          id: "board-maintenance",
          title: "Ведение доски задач",
          description: "Поддерживать актуальные статусы по спринту.",
          dateLabel: "14.05.2026",
          assignee: "CA",
          tone: "blue",
        },
        {
          id: "database-schema",
          title: "Обновление схемы БД",
          description: "Добавить сущности профилей, проектов и заявок.",
          dateLabel: "08.05.2026",
          assignee: "T3",
          tone: "orange",
        },
        {
          id: "api-implementation",
          title: "Реализовать api",
          description: "Подключить endpoints поиска и заявок.",
          dateLabel: "10.05.2026",
          assignee: "T3",
          tone: "blue",
        },
        {
          id: "design-editing",
          title: "Редактирование согласно дизайну",
          description: "Убрать черновые формулировки и привести тексты к проекту.",
          dateLabel: "05.05.2026",
          assignee: "MM",
          tone: "green",
        },
        {
          id: "component-pages",
          title: "Создание страниц компонентов",
          description: "Довести страницы профиля, поиска, проектов и заявок.",
          dateLabel: "12.05.2026",
          assignee: "MM",
          tone: "rose",
        },
      ],
    },
    {
      id: "review",
      title: "На проверке",
      accent: "neutral",
      tasks: [
        {
          id: "analytics-update",
          title: "Обновление аналитики",
          description: "Синхронизировать выводы и статус проекта.",
          dateLabel: "06.05.2026",
          assignee: "CA",
          tone: "blue",
        },
        {
          id: "docs-github-folder",
          title: "оформить папку документации, гитхаб",
          description: "Привести README, тесты и материалы репозитория в порядок.",
          dateLabel: "06.05.2026",
          assignee: "CA",
          tone: "blue",
        },
        {
          id: "us-use-case-update",
          title: "Обновление US +use case",
          description: "Обновить user stories и use cases под текущий функционал.",
          dateLabel: "03.05.2026",
          assignee: "CA",
          tone: "rose",
        },
      ],
    },
    {
      id: "done",
      title: "Сделано",
      accent: "neutral",
      tasks: [],
    },
  ];
}
