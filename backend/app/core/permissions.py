from app.db.models import Role, User

PERMISSIONS_MATRIX = {
    "chart.view": [Role.PHYSICIAN, Role.NURSE, Role.FRONT_DESK, Role.ADMIN],
    "chart.view_clinical": [Role.PHYSICIAN, Role.NURSE, Role.ADMIN],  # Excludes FRONT_DESK
    "condition.create": [Role.PHYSICIAN, Role.ADMIN],
    "condition.update": [Role.PHYSICIAN, Role.ADMIN],
    "condition.deactivate": [Role.PHYSICIAN, Role.ADMIN],
    "medication.create": [Role.PHYSICIAN, Role.ADMIN],
    "medication.update": [Role.PHYSICIAN, Role.ADMIN],
    "medication.deactivate": [Role.PHYSICIAN, Role.ADMIN],
    "observation.create": [Role.PHYSICIAN, Role.NURSE, Role.ADMIN],
    "observation.update": [Role.PHYSICIAN, Role.NURSE, Role.ADMIN],
    "allergy.create": [Role.PHYSICIAN, Role.NURSE, Role.ADMIN],
    "allergy.update": [Role.PHYSICIAN, Role.NURSE, Role.ADMIN],
    "allergy.deactivate": [Role.PHYSICIAN, Role.NURSE, Role.ADMIN],
    "encounter.create": [Role.PHYSICIAN, Role.NURSE, Role.ADMIN],
    "encounter.update": [Role.PHYSICIAN, Role.NURSE, Role.ADMIN],
    "patient.update_demographics": [Role.PHYSICIAN, Role.NURSE, Role.FRONT_DESK, Role.ADMIN],
    "chat.use": [Role.PHYSICIAN, Role.NURSE, Role.ADMIN],
    "audit.view": [Role.ADMIN],
}

def can(user: User, action: str) -> bool:
    """
    Checks if a user is allowed to perform the given action.
    Returns True if allowed, False otherwise.
    """
    allowed_roles = PERMISSIONS_MATRIX.get(action, [])
    return user.role in allowed_roles
