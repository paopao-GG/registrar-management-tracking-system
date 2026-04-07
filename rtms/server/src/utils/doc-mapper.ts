export function toDocumentsObject(t: { docCOR: number; docCOG: number; docCMC: number; docAUTH: number; docOTR: number }) {
  return { COR: t.docCOR, COG: t.docCOG, CMC: t.docCMC, AUTH: t.docAUTH, OTR: t.docOTR };
}

export function toDocColumns(docs: { COR: number; COG: number; CMC: number; AUTH: number; OTR: number }) {
  return { docCOR: docs.COR, docCOG: docs.COG, docCMC: docs.CMC, docAUTH: docs.AUTH, docOTR: docs.OTR };
}

export function toApiTransaction(t: any) {
  return {
    _id: t.id,
    studentId: t.studentId,
    studentName: t.studentName,
    studentCourse: t.studentCourse,
    studentYearLevel: t.studentYearLevel,
    requestedDocuments: toDocumentsObject(t),
    others: t.others,
    othersCount: t.othersCount,
    status: t.status,
    preparedBy: t.preparedBy,
    preparedByName: t.preparedByName,
    preparedAt: t.preparedAt,
    reviewedBy: t.reviewedBy,
    reviewedByName: t.reviewedByName,
    reviewedAt: t.reviewedAt,
    duration: t.duration,
    releasedTo: t.releasedTo,
    signature: t.signature,
    releasedAt: t.releasedAt,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}
