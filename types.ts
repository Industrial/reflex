import { ElementType } from 'https://esm.sh/react@18.1.0';

import { Request as OakRequest } from 'https://deno.land/x/oak@v10.6.0/mod.ts';

export type DocumentElement = ElementType<DocumentProps>;

export type DocumentProps = {
  request: OakRequest;
  vendorSourcePrefix: string;
};
