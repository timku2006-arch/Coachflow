// «Актор» — проверенный пользователь, от имени которого выполняется операция.
// Все сервисы принимают актора и сами проверяют права доступа.
export type TrainerActor = { role: "TRAINER"; userId: string; trainerId: string };
export type ClientActor = { role: "CLIENT"; userId: string; clientId: string; trainerId: string };
export type Actor = TrainerActor | ClientActor;
