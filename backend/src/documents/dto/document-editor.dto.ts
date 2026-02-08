import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DocumentEditorConfigResponse {
  @ApiProperty() document: {
    fileType: string;
    key: string;
    title: string;
    url: string;
    permissions: { edit: boolean; download: boolean; print: boolean };
  };
  @ApiProperty() editorConfig: {
    mode: string;
    callbackUrl: string;
    lang: string;
    user: { id: string; name: string };
    customization?: { autosave: boolean; forcesave: boolean };
  };
  @ApiProperty() token: string;
}

export class EditorCheckResponse {
  @ApiProperty() canView: boolean;
  @ApiProperty() canEdit: boolean;
}
