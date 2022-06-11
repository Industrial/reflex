import { OakRequest, React } from './deps.ts';

export type DocumentElement = React.ElementType<DocumentProps>;

export type DocumentProps = {
  request: OakRequest;
  vendorSourcePrefix: string;
};
