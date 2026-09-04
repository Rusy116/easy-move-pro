import type { ModuleDict } from "./types";

/**
 * Display labels for the AI agent registry (public.ai_agents).
 *
 * The database stores stable internal keys such as `product_factory`.
 * Nothing here changes those values — this file only maps a key to the
 * localized NAME and DESCRIPTION rendered in the UI. When a key is missing
 * the UI falls back to the English name stored in the registry row.
 */
export const agents: ModuleDict = {
  en: {
    "agent.ai_ceo.name": "AI CEO",
    "agent.ai_ceo.desc":
      "Orchestrates every agent, sets daily growth priorities and approves plans.",
    "agent.usa_data_engine.name": "USA Data Engine",
    "agent.usa_data_engine.desc":
      "Master USA dataset: states, counties, cities, ZIP codes, neighborhoods, highways, coordinates, population, demand score and SEO priority.",
    "agent.city_landing_agent.name": "City Calculator Factory",
    "agent.city_landing_agent.desc":
      "Always first. Import city, generate the calculator page, validate 22 gates, publish. Exactly one calculator per city.",
    "agent.seo_factory.name": "SEO Factory",
    "agent.seo_factory.desc":
      "Produces city, route, service and category pages with schema and internal links.",
    "agent.seo_landing_factory.name": "SEO Landing Factory",
    "agent.seo_landing_factory.desc":
      "Builds the localized service page for each city that embeds the one official calculator.",
    "agent.content_factory.name": "Content Factory",
    "agent.content_factory.desc": "Writes articles, guides, FAQs and comparison pages.",
    "agent.internal_linking_engine.name": "Internal Linking Engine",
    "agent.internal_linking_engine.desc":
      "Hierarchical link mesh from neighborhood to USA hub with reverse links and an orphan guard.",
    "agent.seo_content_engine.name": "SEO Content Engine",
    "agent.seo_content_engine.desc":
      "Unique localized content per city: FAQ, neighborhoods, parking, regulations, weather, landmarks and ZIP data.",
    "agent.blog_agent.name": "Consumer Blog Agent",
    "agent.blog_agent.desc":
      "SEO articles for moving customers, each linking to the calculator, city pages and store.",
    "agent.publishing_agent.name": "Publishing Agent",
    "agent.publishing_agent.desc": "Moves approved content through the publishing queue.",
    "agent.analytics_agent.name": "Analytics Agent",
    "agent.analytics_agent.desc": "Tracks clicks, impressions, CTR, positions and revenue.",
    "agent.mover_growth_agent.name": "Moving Company Growth Agent",
    "agent.mover_growth_agent.desc":
      "SEO articles targeting moving companies; every article promotes marketplace registration.",
    "agent.crm_intelligence.name": "CRM Intelligence",
    "agent.crm_intelligence.desc": "Surfaces lead quality signals and pipeline insights.",
    "agent.product_factory.name": "Digital Product Agent",
    "agent.product_factory.desc":
      "Checklists, planners, templates, inventory sheets, labels and guides with landing page, SEO and download page.",
    "agent.email_agent.name": "Email Agent",
    "agent.email_agent.desc": "Drafts and schedules lifecycle email campaigns.",
    "agent.image_factory.name": "Image Agent",
    "agent.image_factory.desc":
      "Featured images, social images, infographics, OpenGraph and Pinterest graphics, product covers.",
    "agent.self_optimization_agent.name": "Self Optimization Agent",
    "agent.self_optimization_agent.desc":
      "Detects underperforming pages and regenerates title, meta, FAQ, links and content, then republishes.",
    "agent.social_agent.name": "Social Agent",
    "agent.social_agent.desc": "Repurposes content into social posts and schedules them.",
    "agent.google_performance_agent.name": "Google Performance Agent",
    "agent.google_performance_agent.desc":
      "Tracks rankings, CTR, impressions, clicks, Core Web Vitals and index status.",
    "agent.video_agent.name": "Video Agent",
    "agent.video_agent.desc": "Turns guides into short-form video scripts and storyboards.",
    "agent.revenue_agent.name": "Revenue Agent",
    "agent.revenue_agent.desc":
      "Read-only rollup of marketplace, broker, digital product and pipeline revenue, MRR and LTV.",

    "agent.category.executive": "Executive",
    "agent.category.data": "Data",
    "agent.category.seo": "SEO",
    "agent.category.content": "Content",
    "agent.category.publishing": "Publishing",
    "agent.category.analytics": "Analytics",
    "agent.category.growth": "Growth",
    "agent.category.crm": "CRM",
    "agent.category.products": "Products",
    "agent.category.lifecycle": "Lifecycle",
    "agent.category.media": "Media",

    "agent.status.ready": "Ready",
    "agent.status.running": "Running",
    "agent.status.waiting": "Waiting",
    "agent.status.paused": "Paused",
    "agent.status.completed": "Completed",
    "agent.status.failed": "Failed",
    "agent.status.retrying": "Retrying",
    "agent.status.disabled": "Disabled",
    "agent.status.queued": "Queued",
    "agent.status.pending": "Pending",
    "agent.status.approved": "Approved",
    "agent.status.rejected": "Rejected",
    "agent.status.draft": "Draft",
    "agent.status.published": "Published",
    "agent.status.error": "Error",
    "agent.status.idle": "Idle",
    "agent.status.candidate": "Candidate",
  },
  ru: {
    "agent.ai_ceo.name": "ИИ-директор",
    "agent.ai_ceo.desc":
      "Координирует всех агентов, задаёт ежедневные приоритеты роста и утверждает планы.",
    "agent.usa_data_engine.name": "Движок данных США",
    "agent.usa_data_engine.desc":
      "Основной набор данных США: штаты, округа, города, почтовые индексы, районы, магистрали, координаты, население, оценка спроса и SEO-приоритет.",
    "agent.city_landing_agent.name": "Фабрика городских калькуляторов",
    "agent.city_landing_agent.desc":
      "Всегда первый. Импорт города, генерация страницы калькулятора, проверка 22 условий, публикация. Ровно один калькулятор на город.",
    "agent.seo_factory.name": "SEO-фабрика",
    "agent.seo_factory.desc":
      "Создаёт страницы городов, маршрутов, услуг и категорий со схемой и внутренними ссылками.",
    "agent.seo_landing_factory.name": "Фабрика SEO-лендингов",
    "agent.seo_landing_factory.desc":
      "Создаёт локализованную страницу услуг для каждого города со встроенным официальным калькулятором.",
    "agent.content_factory.name": "Фабрика контента",
    "agent.content_factory.desc": "Пишет статьи, руководства, FAQ и сравнительные страницы.",
    "agent.internal_linking_engine.name": "Движок внутренней перелинковки",
    "agent.internal_linking_engine.desc":
      "Иерархическая сеть ссылок от района до хаба США с обратными ссылками и защитой от страниц-сирот.",
    "agent.seo_content_engine.name": "Движок SEO-контента",
    "agent.seo_content_engine.desc":
      "Уникальный локальный контент для каждого города: FAQ, районы, парковка, правила, погода, достопримечательности и данные по индексам.",
    "agent.blog_agent.name": "Блог-агент для клиентов",
    "agent.blog_agent.desc":
      "SEO-статьи для клиентов переезда, каждая ведёт на калькулятор, страницы городов и магазин.",
    "agent.publishing_agent.name": "Агент публикации",
    "agent.publishing_agent.desc": "Проводит утверждённый контент через очередь публикации.",
    "agent.analytics_agent.name": "Агент аналитики",
    "agent.analytics_agent.desc": "Отслеживает клики, показы, CTR, позиции и выручку.",
    "agent.mover_growth_agent.name": "Агент роста для перевозчиков",
    "agent.mover_growth_agent.desc":
      "SEO-статьи для транспортных компаний; каждая статья продвигает регистрацию на маркетплейсе.",
    "agent.crm_intelligence.name": "CRM-аналитика",
    "agent.crm_intelligence.desc": "Показывает сигналы качества лидов и аналитику воронки.",
    "agent.product_factory.name": "Агент цифровых продуктов",
    "agent.product_factory.desc":
      "Чек-листы, планировщики, шаблоны, описи, этикетки и руководства с лендингом, SEO и страницей скачивания.",
    "agent.email_agent.name": "Email-агент",
    "agent.email_agent.desc": "Готовит и планирует жизненные email-кампании.",
    "agent.image_factory.name": "Агент изображений",
    "agent.image_factory.desc":
      "Обложки, изображения для соцсетей, инфографика, графика OpenGraph и Pinterest, обложки продуктов.",
    "agent.self_optimization_agent.name": "Агент самооптимизации",
    "agent.self_optimization_agent.desc":
      "Находит слабые страницы и заново создаёт заголовок, метаданные, FAQ, ссылки и контент, затем публикует.",
    "agent.social_agent.name": "Агент соцсетей",
    "agent.social_agent.desc": "Превращает контент в посты для соцсетей и планирует их.",
    "agent.google_performance_agent.name": "Агент эффективности Google",
    "agent.google_performance_agent.desc":
      "Отслеживает позиции, CTR, показы, клики, Core Web Vitals и статус индексации.",
    "agent.video_agent.name": "Видео-агент",
    "agent.video_agent.desc": "Превращает руководства в сценарии коротких видео и раскадровки.",
    "agent.revenue_agent.name": "Агент выручки",
    "agent.revenue_agent.desc":
      "Сводка только для чтения по выручке маркетплейса, брокеров, цифровых продуктов и воронки, MRR и LTV.",

    "agent.category.executive": "Руководство",
    "agent.category.data": "Данные",
    "agent.category.seo": "SEO",
    "agent.category.content": "Контент",
    "agent.category.publishing": "Публикация",
    "agent.category.analytics": "Аналитика",
    "agent.category.growth": "Рост",
    "agent.category.crm": "CRM",
    "agent.category.products": "Продукты",
    "agent.category.lifecycle": "Жизненный цикл",
    "agent.category.media": "Медиа",

    "agent.status.ready": "Готов",
    "agent.status.running": "Выполняется",
    "agent.status.waiting": "Ожидание",
    "agent.status.paused": "Пауза",
    "agent.status.completed": "Завершён",
    "agent.status.failed": "Ошибка",
    "agent.status.retrying": "Повтор",
    "agent.status.disabled": "Отключён",
    "agent.status.queued": "В очереди",
    "agent.status.pending": "Ожидает",
    "agent.status.approved": "Утверждено",
    "agent.status.rejected": "Отклонено",
    "agent.status.draft": "Черновик",
    "agent.status.published": "Опубликовано",
    "agent.status.error": "Ошибка",
    "agent.status.idle": "Простой",
    "agent.status.candidate": "Кандидат",
  },
  es: {
    "agent.ai_ceo.name": "Director IA",
    "agent.ai_ceo.desc":
      "Coordina a todos los agentes, fija las prioridades diarias de crecimiento y aprueba los planes.",
    "agent.usa_data_engine.name": "Motor de datos de EE. UU.",
    "agent.usa_data_engine.desc":
      "Conjunto maestro de datos de EE. UU.: estados, condados, ciudades, códigos postales, barrios, autopistas, coordenadas, población, puntuación de demanda y prioridad SEO.",
    "agent.city_landing_agent.name": "Fábrica de calculadoras por ciudad",
    "agent.city_landing_agent.desc":
      "Siempre primero. Importa la ciudad, genera la página de calculadora, valida 22 controles y publica. Exactamente una calculadora por ciudad.",
    "agent.seo_factory.name": "Fábrica SEO",
    "agent.seo_factory.desc":
      "Genera páginas de ciudad, ruta, servicio y categoría con esquema y enlaces internos.",
    "agent.seo_landing_factory.name": "Fábrica de landings SEO",
    "agent.seo_landing_factory.desc":
      "Crea la página de servicio localizada de cada ciudad que integra la única calculadora oficial.",
    "agent.content_factory.name": "Fábrica de contenido",
    "agent.content_factory.desc": "Escribe artículos, guías, preguntas frecuentes y comparativas.",
    "agent.internal_linking_engine.name": "Motor de enlazado interno",
    "agent.internal_linking_engine.desc":
      "Malla jerárquica de enlaces desde el barrio hasta el hub de EE. UU., con enlaces inversos y protección contra páginas huérfanas.",
    "agent.seo_content_engine.name": "Motor de contenido SEO",
    "agent.seo_content_engine.desc":
      "Contenido local único por ciudad: preguntas frecuentes, barrios, aparcamiento, normativa, clima, lugares emblemáticos y códigos postales.",
    "agent.blog_agent.name": "Agente de blog para clientes",
    "agent.blog_agent.desc":
      "Artículos SEO para clientes de mudanzas, cada uno enlaza a la calculadora, las páginas de ciudad y la tienda.",
    "agent.publishing_agent.name": "Agente de publicación",
    "agent.publishing_agent.desc": "Mueve el contenido aprobado por la cola de publicación.",
    "agent.analytics_agent.name": "Agente de analítica",
    "agent.analytics_agent.desc": "Controla clics, impresiones, CTR, posiciones e ingresos.",
    "agent.mover_growth_agent.name": "Agente de crecimiento para transportistas",
    "agent.mover_growth_agent.desc":
      "Artículos SEO dirigidos a empresas de mudanzas; cada artículo promueve el registro en el marketplace.",
    "agent.crm_intelligence.name": "Inteligencia CRM",
    "agent.crm_intelligence.desc":
      "Revela señales de calidad de los clientes potenciales e información del embudo.",
    "agent.product_factory.name": "Agente de productos digitales",
    "agent.product_factory.desc":
      "Listas de control, planificadores, plantillas, inventarios, etiquetas y guías con landing, SEO y página de descarga.",
    "agent.email_agent.name": "Agente de correo",
    "agent.email_agent.desc": "Redacta y programa campañas de correo del ciclo de vida.",
    "agent.image_factory.name": "Agente de imágenes",
    "agent.image_factory.desc":
      "Imágenes destacadas, imágenes sociales, infografías, gráficos OpenGraph y Pinterest, portadas de producto.",
    "agent.self_optimization_agent.name": "Agente de autooptimización",
    "agent.self_optimization_agent.desc":
      "Detecta páginas con bajo rendimiento y regenera título, metadatos, preguntas frecuentes, enlaces y contenido, y vuelve a publicar.",
    "agent.social_agent.name": "Agente social",
    "agent.social_agent.desc": "Reutiliza el contenido en publicaciones sociales y las programa.",
    "agent.google_performance_agent.name": "Agente de rendimiento en Google",
    "agent.google_performance_agent.desc":
      "Controla posiciones, CTR, impresiones, clics, Core Web Vitals y estado de indexación.",
    "agent.video_agent.name": "Agente de vídeo",
    "agent.video_agent.desc": "Convierte guías en guiones de vídeo corto y storyboards.",
    "agent.revenue_agent.name": "Agente de ingresos",
    "agent.revenue_agent.desc":
      "Resumen de solo lectura de los ingresos del marketplace, brókeres, productos digitales y embudo, MRR y LTV.",

    "agent.category.executive": "Dirección",
    "agent.category.data": "Datos",
    "agent.category.seo": "SEO",
    "agent.category.content": "Contenido",
    "agent.category.publishing": "Publicación",
    "agent.category.analytics": "Analítica",
    "agent.category.growth": "Crecimiento",
    "agent.category.crm": "CRM",
    "agent.category.products": "Productos",
    "agent.category.lifecycle": "Ciclo de vida",
    "agent.category.media": "Medios",

    "agent.status.ready": "Listo",
    "agent.status.running": "En ejecución",
    "agent.status.waiting": "En espera",
    "agent.status.paused": "En pausa",
    "agent.status.completed": "Completado",
    "agent.status.failed": "Fallido",
    "agent.status.retrying": "Reintentando",
    "agent.status.disabled": "Desactivado",
    "agent.status.queued": "En cola",
    "agent.status.pending": "Pendiente",
    "agent.status.approved": "Aprobado",
    "agent.status.rejected": "Rechazado",
    "agent.status.draft": "Borrador",
    "agent.status.published": "Publicado",
    "agent.status.error": "Error",
    "agent.status.idle": "Inactivo",
    "agent.status.candidate": "Candidato",
  },
};
