/**
 * Clases para modales de crear/editar entidad.
 * Sin scroll interno: el contenido debe caber compacto y legible.
 * Ver app/globals.css → .scheduly-entity-modal
 */
export const ENTITY_MODAL_DIALOG_CLASS =
  "scheduly-entity-modal w-full !max-w-lg overflow-visible";

export const ENTITY_MODAL_BODY_CLASS =
  "scheduly-entity-modal__body !overflow-visible";

/** Header del modal: icono + título + ? del tutorial de registro. */
export const ENTITY_MODAL_HEADER_CLASS =
  "scheduly-entity-modal__header items-center gap-2 pr-8";

/** Formulario denso dentro del modal de entidad. */
export const ENTITY_FORM_CLASS = "scheduly-entity-form flex flex-col gap-2.5";

/** Input/textarea/select nativos en forms de entidad. */
export const ENTITY_FIELD_CLASS =
  "rounded-lg border border-separator bg-field-background px-2.5 py-1.5 text-sm text-field-foreground placeholder:text-field-placeholder focus:outline-none focus:ring-2 focus:ring-focus";
