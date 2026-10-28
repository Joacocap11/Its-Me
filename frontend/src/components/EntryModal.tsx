import type { Attribute, Entry } from "../api/types";
import { EntryForm } from "./EntryForm";
import { PrescriptionForm } from "./PrescriptionForm";
import { Modal } from "./ui";

export function EntryModal({
  attribute,
  entry,
  seedEntry,
  onSaved,
  onClose,
}: {
  attribute: Attribute;
  entry?: Entry;
  seedEntry?: Entry;
  onSaved: (entry: Entry) => void;
  onClose: () => void;
}) {
  return (
    <Modal title={`${entry ? "Editar valor" : "Nuevo valor"} · ${attribute.name}`} onClose={onClose}>
      {attribute.data_type === "prescription" ? (
        <PrescriptionForm attribute={attribute} entry={entry} onSaved={onSaved} onCancel={onClose} />
      ) : (
        <EntryForm attribute={attribute} entry={entry} seedEntry={seedEntry} onSaved={onSaved} onCancel={onClose} />
      )}
    </Modal>
  );
}
