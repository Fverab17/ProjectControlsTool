import enum


class SystemRole(str, enum.Enum):
    admin = "admin"
    instructor = "instructor"
    student = "student"


class ProjectRole(str, enum.Enum):
    pm = "pm"
    cost_engineer = "cost_engineer"
    scheduler = "scheduler"
    controller = "controller"
    viewer = "viewer"


class PctMethod(str, enum.Enum):
    manual = "manual"
    weighted_steps = "weighted_steps"
    rules_of_credit = "rules_of_credit"
    level_of_effort = "level_of_effort"
    fifty_fifty = "fifty_fifty"


class EtcMethod(str, enum.Enum):
    # EAC = AC + ETC (user enters ETC manually — PRISM default)
    manual = "manual"
    # ETC = BAC - EV;  EAC = AC + ETC
    budget_remaining = "budget_remaining"
    # EAC = BAC / CPI; ETC = EAC - AC
    performance_factor = "performance_factor"
    # EAC = AC + Open Commitments; used for procurement accounts
    commitments = "commitments"
    # ETC = 0; EAC = AC (account 100% complete — mirrors PRISM CLS)
    closed = "closed"


class ContractStatus(str, enum.Enum):
    draft = "draft"
    awarded = "awarded"
    active = "active"
    closed = "closed"
    cancelled = "cancelled"


class InvoiceStatus(str, enum.Enum):
    draft = "draft"
    pending = "pending"
    approved = "approved"
    paid = "paid"
    rejected = "rejected"


class ChangeStatus(str, enum.Enum):
    pending = "pending"
    submitted = "submitted"
    approved = "approved"
    cancelled = "cancelled"
    # legacy values kept for DB compatibility
    trend = "trend"
    rejected = "rejected"
    withdrawn = "withdrawn"


class ChangeCategory(str, enum.Enum):
    budget_transfer = "budget_transfer"
    scope = "scope"
    growth = "growth"
    trend = "trend"


class ChangeReason(str, enum.Enum):
    scope = "scope"
    design = "design"
    site_conditions = "site_conditions"
    schedule = "schedule"
    rate = "rate"
    other = "other"


class ChangeImpact(str, enum.Enum):
    cost = "cost"
    schedule = "schedule"
    both = "both"
    none = "none"


class PriceType(str, enum.Enum):
    lump_sum = "lump_sum"
    unit_rate = "unit_rate"
    reimbursable = "reimbursable"
    time_and_materials = "time_and_materials"


class CurveType(str, enum.Enum):
    linear = "linear"
    s_curve = "s_curve"
    front_loaded = "front_loaded"
    back_loaded = "back_loaded"
    milestone = "milestone"


class ProjectStatus(str, enum.Enum):
    active = "active"
    on_hold = "on_hold"
    closed = "closed"
    cancelled = "cancelled"
    completed = "completed"


class ProjectType(str, enum.Enum):
    capex = "capex"
    opex = "opex"
    abex = "abex"
