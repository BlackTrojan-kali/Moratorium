import type {
  Deposit,
  DocumentRule,
  DraftInput,
  Issue,
  Options,
} from './types';

export interface FormValues {
  contactName: string;
  contactEmail: string;
  address: string;
  debtAmount: string;
  remissionReason: string;
  typeCode: string;
  reason: string;
  months: string;
  advanceAmount: string;
}

export function formValues(
  input?: DraftInput,
): FormValues {
  return {
    contactName: input?.contactName ?? '',
    contactEmail: input?.contactEmail ?? '',
    address: input?.address ?? '',
    debtAmount: input?.debtAmount ?? '',
    remissionReason: input?.remissionReason ?? '',
    typeCode: input?.typeCode ?? '',
    reason: input?.reason ?? '',
    months:
      input?.months == null
        ? ''
        : String(input.months),
    advanceAmount: input?.advanceAmount ?? '',
  };
}

export function checkInput(
  form: FormValues,
  options: Options,
  complete: boolean,
) {
  const issues: Issue[] = [];

  const type = options.requestTypes.find(
    item => item.code === form.typeCode,
  );

  if (!type) {
    issues.push({
      field: 'typeCode',
      message: 'Select a request type.',
    });
  }

  const months =
    form.months.trim() === ''
      ? null
      : Number(form.months);

  if (
    type?.requiresMonths &&
    (
      (complete && months === null) ||
      (
        months !== null &&
        (
          !Number.isSafeInteger(months) ||
          (
            type.minMonths !== null &&
            months < type.minMonths
          ) ||
          (
            type.maxMonths !== null &&
            months > type.maxMonths
          )
        )
      )
    )
  ) {
    issues.push({
      field: 'months',
      message:
        'Enter a duration within the displayed limits.',
    });
  }

  const amount = form.advanceAmount.trim();

  const pattern =
    options.moneyDecimals === 0
      ? /^\d+$/
      : new RegExp(
          `^\\d+(\\.\\d{1,${options.moneyDecimals}})?$`,
        );

  if (
    type?.requiresAdvance &&
    (
      (complete && !amount) ||
      (amount && !pattern.test(amount))
    )
  ) {
    issues.push({
      field: 'advanceAmount',
      message:
        'Enter a valid advance amount using the displayed currency precision.',
    });
  }

  if (complete) {
    for(const field of ['contactName','contactEmail','address','debtAmount'] as const) if(!form[field].trim()) issues.push({field,message:`Complete ${field}.`});
    if(form.typeCode==='moratorium_remission'&&!form.remissionReason.trim()) issues.push({field:'remissionReason',message:'Explain the requested remission.'});
  }
  const input: DraftInput = {
    contactName:form.contactName.trim(),contactEmail:form.contactEmail.trim(),address:form.address.trim(),debtAmount:form.debtAmount.trim(),remissionReason:form.remissionReason.trim(),
    typeCode: form.typeCode,
    reason: form.reason.trim(),
    months: type?.requiresMonths ? months : null,
    advanceAmount:
      type?.requiresAdvance && amount
        ? amount
        : null,
  };

  return { issues, input };
}

export function checkDocuments(
  record: Deposit,
  options: Options,
): Issue[] {
  const type = options.requestTypes.find(
    item => item.code === record.fields.typeCode,
  );

  if (!type) {
    return [{
      field: 'typeCode',
      message:
        'The saved request type is unavailable.',
    }];
  }

  return type.documentRules
    .filter(rule =>
      rule.required &&
      !record.documents.some(document =>
        document.category === rule.code &&
        document.scanState === 'ready',
      ),
    )
    .map(rule => ({
      field: 'documents',
      message:
        `Required document not ready: ${rule.label}.`,
    }));
}

export function checkFile(
  file: File,
  rule: DocumentRule,
  existingCount: number,
): string | null {
  if (!rule.employerCanUpload) {
    return 'This document must be supplied by the responsible office.';
  }

  if (existingCount >= rule.maxFiles) {
    return 'The maximum number of files for this category has been reached.';
  }

  if (file.size === 0) {
    return 'The selected file is empty.';
  }

  if (file.size > rule.maxBytes) {
    return 'The selected file exceeds the displayed size limit.';
  }

  const name = file.name.toLowerCase();
  const mime = file.type.toLowerCase();

  const accepted = rule.accept.some(raw => {
    const token = raw.toLowerCase();

    if (token.startsWith('.')) {
      return name.endsWith(token);
    }

    if (token.endsWith('/*')) {
      return mime.startsWith(token.slice(0, -1));
    }

    return mime === token;
  });

  return accepted
    ? null
    : 'This file format is not accepted for this category.';
}