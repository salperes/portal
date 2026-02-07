# @portal/ui Module

## Overview
Paylaşılan React UI bileşenleri. Tailwind CSS + Lucide React.

## Components

| Component | Props | Description |
|-----------|-------|-------------|
| `Button` | variant, size, isLoading, fullWidth | Primary, secondary, danger, ghost |
| `Card` | variant, padding | Container with optional header |
| `Modal` | isOpen, onClose, title, footer, size | Dialog overlay |
| `Avatar` | name, src, size | User avatar with initials fallback |
| `Badge` | variant, size | Status indicator |
| `Alert` | variant, title | Info, success, warning, error |
| `Input` | label, error, variant, leftIcon | Form input |
| `SearchInput` | - | Input with search icon |
| `Loading` | size, text | Spinner |
| `PageLoading` | text | Full page spinner |

## Usage

```tsx
import { Button, Card, Modal, Avatar, Badge, Alert, Input, Loading, cn } from '@portal/ui';

<Button variant="primary" isLoading={loading}>Kaydet</Button>
<Card variant="bordered"><CardContent>İçerik</CardContent></Card>
<Modal isOpen={open} onClose={() => setOpen(false)} title="Başlık">İçerik</Modal>
<Avatar name="Ahmet Yılmaz" size="md" />
<Badge variant="success">Aktif</Badge>
<Alert variant="error" title="Hata">Mesaj</Alert>
<Input label="E-posta" error={errors.email} />
<Loading size="lg" />
```

## File Structure

```
packages/ui/src/
├── index.ts
├── utils/cn.ts
└── components/
    ├── Button.tsx, Card.tsx, Modal.tsx
    ├── Avatar.tsx, Badge.tsx, Alert.tsx
    ├── Input.tsx, Loading.tsx
    └── index.ts
```

## Dependencies

- `react` (peer), `lucide-react`, `clsx`, `tailwind-merge`

## Design System

Full docs: [UI_TEMPLATE.md](../../UI_TEMPLATE.md)
