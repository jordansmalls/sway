// csv-writer 1.6.0 ships its TypeScript sources as `types`, which tsc then type-checks under
// this project's settings (skipLibCheck only covers .d.ts). tsconfig `paths` points the import
// at the compiled dist/index.js instead, and this mirrors the package's public API for it.
declare module "csv-writer" {
    export type Field = unknown;

    export type ObjectHeaderItem = { id: string; title: string };
    export type ObjectStringifierHeader = ObjectHeaderItem[] | string[];

    export interface ObjectMap<T> {
        [k: string]: T;
    }

    export interface ArrayCsvStringifierParams {
        header?: string[];
        fieldDelimiter?: string;
        recordDelimiter?: string;
        alwaysQuote?: boolean;
    }

    export interface ObjectCsvStringifierParams {
        header: ObjectStringifierHeader;
        fieldDelimiter?: string;
        recordDelimiter?: string;
        headerIdDelimiter?: string;
        alwaysQuote?: boolean;
    }

    export interface ArrayCsvWriterParams extends ArrayCsvStringifierParams {
        path: string;
        encoding?: string;
        append?: boolean;
    }

    export interface ObjectCsvWriterParams extends ObjectCsvStringifierParams {
        path: string;
        encoding?: string;
        append?: boolean;
    }

    export interface CsvStringifier<T> {
        getHeaderString(): string | null;
        stringifyRecords(records: IterableIterator<T> | T[]): string;
    }

    export interface CsvWriter<T> {
        writeRecords(records: T[]): Promise<void>;
    }

    export const createArrayCsvStringifier: (params: ArrayCsvStringifierParams) => CsvStringifier<Field[]>;
    export const createObjectCsvStringifier: (
        params: ObjectCsvStringifierParams,
    ) => CsvStringifier<ObjectMap<Field>>;
    export const createArrayCsvWriter: (params: ArrayCsvWriterParams) => CsvWriter<Field[]>;
    export const createObjectCsvWriter: (params: ObjectCsvWriterParams) => CsvWriter<ObjectMap<Field>>;
}
