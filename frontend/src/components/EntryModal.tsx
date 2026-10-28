import type { Attribute, Entry } from "../api/types";
import { EntryForm } from "./EntryForm";
import { Modal } from "./ui";

export function EntryModal({
  attribute,
  entry,
  onSaved,
  onClose,
}: {
  attribute: Attribute;
  entry?: Entry;
  onSaved: (entry: Entry) => void;
  onClose: () => void;
}) {
  return (
    <Modal title={`${entry ? "Editar valor" : "Nuevo valor"} · ${attribute.name}`} onClose={onClose}>
      <EntryForm attribute={attribute} entry={entry} onSaved={onSaved} onCancel={onClose} />
    </Modal>
  );
}
