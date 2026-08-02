/**
 * English base dictionary. Every other locale mirrors these keys.
 * Keys are namespaced with dots: `<area>.<element>`.
 */
export const en = {
  // ---------------------------------------------------------------- generic
  "common.signIn": "Sign in",
  "common.signOut": "Sign out",
  "common.signUp": "Create account",
  "common.dashboard": "Dashboard",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.close": "Close",
  "common.search": "Search",
  "common.loading": "Loading…",
  "common.language": "Language",
  "common.back": "Back",
  "common.next": "Next",
  "common.submit": "Submit",
  "common.email": "Email",
  "common.password": "Password",
  "common.phone": "Phone",
  "common.name": "Name",
  "common.menu": "Menu",
  "common.profile": "Profile",
  "common.none": "None",
  "common.yes": "Yes",
  "common.no": "No",

  // ------------------------------------------------------------ public site
  "site.brand": "Easy Moving",
  "site.nav.calculator": "Calculator",
  "site.nav.services": "Services",
  "site.nav.cities": "City Pages",
  "site.nav.store": "Store",
  "site.nav.blog": "Blog",
  "site.nav.partners": "For Movers",
  "site.nav.about": "About",
  "site.nav.contact": "Contact",
  "site.cta.quote": "Get Instant Quote",
  "site.cta.quoteShort": "Get Quote",

  // ------------------------------------------------------------------ shell
  "shell.eyebrow.admin": "Broker admin",
  "shell.eyebrow.broker": "Broker",
  "shell.eyebrow.company": "Moving company",
  "shell.eyebrow.customer": "Customer",
  "shell.toggleMenu": "Toggle menu",

  // ------------------------------------------------------------------- navs
  "nav.dashboard": "Dashboard",
  "nav.leads": "Leads",
  "nav.marketplace": "Marketplace",
  "nav.companies": "Companies",
  "nav.brokers": "Brokers",
  "nav.customers": "Customers",
  "nav.finance": "Finance",
  "nav.reports": "Reports",
  "nav.settings": "Settings",
  "nav.performance": "Performance",
  "nav.move": "Move",
  "nav.quotes": "Quotes",
  "nav.messages": "Messages",
  "nav.documents": "Documents",
  "nav.notifications": "Notifications",
  "nav.library": "Library",
  "nav.reviews": "Reviews",
  "nav.jobs": "Jobs",
  "nav.availableJobs": "Available jobs",
  "nav.scheduled": "Scheduled",
  "nav.profile": "Profile",
  "nav.myJobs": "My jobs",
  "nav.estimates": "Estimates",
  "nav.invoices": "Invoices",
  "nav.schedule": "Schedule",
  "nav.analytics": "Analytics",
  "nav.support": "Support",
  "nav.profileCompany": "Company profile",

  // ----------------------------------------------------------------- access
  "access.denied.title": "Access denied",
  "access.denied.message": "You don't have permission to view this workspace.",
  "access.backHome": "Back to home",

  // ------------------------------------------------------------------- auth
  "auth.title": "Welcome back",
  "auth.subtitle": "Sign in to manage your move.",
  "auth.disabled": "This account has been disabled. Contact support.",
  "auth.invalid": "Invalid email or password.",

  // ------------------------------------------------------- roles & statuses
  "role.admin": "Administrator",
  "role.broker": "Broker",
  "role.mover": "Moving company",
  "role.customer": "Customer",

  "status.lead.draft": "Draft",
  "status.lead.submitted": "Submitted",
  "status.lead.under_review": "Under Review",
  "status.lead.qualified": "Qualified",
  "status.lead.published": "Published",
  "status.lead.claimed": "Claimed",
  "status.lead.contacted": "Contacted",
  "status.lead.price_confirmed": "Price Confirmed",
  "status.lead.customer_confirmed": "Customer Confirmed",
  "status.lead.completed": "Completed",
  "status.lead.rejected": "Rejected",
  "status.lead.cancelled": "Cancelled",

  "status.job.available": "Available",
  "status.job.claimed": "Claimed",
  "status.job.contacted": "Contacted",
  "status.job.final_quote_sent": "Estimate sent",
  "status.job.booked": "Booked",
  "status.job.scheduled": "Scheduled",
  "status.job.completed": "Completed",
  "status.job.cancelled": "Cancelled",
  "status.job.expired": "Expired",

  // -------------------------------------------------------------- documents
  "doc.estimate.title": "Moving Estimate",
  "doc.invoice.title": "Invoice",
  "doc.bol.title": "Bill of Lading",
  "doc.contract.title": "Moving Services Agreement",
  "doc.field.quoteNumber": "Quote number",
  "doc.field.date": "Date",
  "doc.field.customer": "Customer",
  "doc.field.origin": "Origin",
  "doc.field.destination": "Destination",
  "doc.field.moveDate": "Move date",
  "doc.field.total": "Total",
  "doc.field.deposit": "Deposit",
  "doc.field.balance": "Balance due",
  "doc.footer.thanks": "Thank you for choosing Easy Moving.",

  // ---------------------------------------------------------- notifications
  "notify.estimateSent": "A new estimate is ready for review.",
  "notify.estimateAccepted": "The customer accepted the estimate.",
  "notify.leadAssigned": "A new lead was assigned to you.",
  "notify.jobClaimed": "A moving company claimed this job.",

  // ------------------------------------------------------------- validation
  "validation.required": "This field is required.",
  "validation.email": "Enter a valid email address.",
  "validation.phone": "Enter a valid phone number.",
  "validation.zip": "Enter a valid ZIP code.",
  "validation.terms": "Please accept the terms to continue.",
} as const;

export type TranslationKey = keyof typeof en;
export type Dictionary = Record<TranslationKey, string>;
