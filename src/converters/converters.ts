import {
  type PartialWithFieldValue,
  QueryDocumentSnapshot,
} from 'firebase/firestore';

type ConverterArgs<T, U, V> = {
  toFirestore?: (data: PartialWithFieldValue<T>) => U;
  fromFirestore?: (id: string, data: T) => V;
};

export const converter = <T, U = PartialWithFieldValue<T>, V = T>({
  toFirestore,
  fromFirestore,
}: ConverterArgs<T, U, V>) => ({
  toFirestore: (data: PartialWithFieldValue<T>) =>
    toFirestore ? toFirestore(data) : data,
  fromFirestore: (snap: QueryDocumentSnapshot<T>) =>
    fromFirestore ? fromFirestore(snap.id, snap.data()) : snap.data(),
});
