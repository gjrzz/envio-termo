import {
  Box,
  Checkbox,
  Chip,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import type { GlpiAsset } from '../../types';

interface AssetListProps {
  assets: GlpiAsset[];
  selectedKeys: string[];
  onToggle: (asset: GlpiAsset) => void;
}

/**
 * Identificador unico de um ativo.
 */
export function getAssetKey(asset: Pick<GlpiAsset, 'id' | 'itemtype'>): string {
  return `${asset.itemtype}-${asset.id}`;
}

const CATEGORIES: { itemtype: string; label: string }[] = [
  { itemtype: 'Computer', label: 'Computadores' },
  { itemtype: 'Monitor', label: 'Monitores' },
  { itemtype: 'Peripheral', label: 'Periféricos' },
  { itemtype: 'Phone', label: 'Telefones' },
  { itemtype: 'Printer', label: 'Impressoras' },
];

/**
 * Lista de equipamentos com design corporativo. Agrupados por tipo,
 * com checkboxes e info secundaria (modelo, serial, patrimônio).
 */
export function AssetList({ assets, selectedKeys, onToggle }: AssetListProps) {
  if (assets.length === 0) {
    return (
      <Box py={3} textAlign="center">
        <Typography color="text.secondary" fontSize="0.9rem">
          Nenhum equipamento atribuído a este colaborador no GLPI.
        </Typography>
      </Box>
    );
  }

  const groups = CATEGORIES.map((category) => ({
    ...category,
    items: assets.filter((asset) => asset.itemtype === category.itemtype),
  })).filter((group) => group.items.length > 0);

  const knownItemtypes = new Set(CATEGORIES.map((category) => category.itemtype));
  const otherItems = assets.filter((asset) => !knownItemtypes.has(asset.itemtype));

  if (otherItems.length > 0) {
    groups.push({ itemtype: 'Other', label: 'Outros', items: otherItems });
  }

  return (
    <Stack spacing={2}>
      {groups.map((group) => (
        <Box key={group.itemtype}>
          <Typography
            variant="body2"
            fontWeight={600}
            color="text.secondary"
            textTransform="uppercase"
            letterSpacing="0.05em"
            fontSize="0.7rem"
            mb={0.5}
            px={1}
          >
            {group.label}
          </Typography>

          <List disablePadding sx={{ '& .MuiListItem-root:last-child': { border: 'none' } }}>
            {group.items.map((asset) => {
              const key = getAssetKey(asset);
              const checked = selectedKeys.includes(key);
              const model = asset.model ?? '';
              const serial = asset.serial ? `S/N: ${asset.serial}` : '';
              const patrimonio = asset.inventoryNumber ? `Pat: ${asset.inventoryNumber}` : '';
              const status = asset.status ? `Status: ${asset.status}` : '';
              const secondary = [model, patrimonio, serial, status].filter(Boolean).join(' · ');

              return (
                <ListItem
                  key={key}
                  disablePadding
                  sx={{
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 0.25,
                    backgroundColor: checked ? 'rgba(32, 26, 71, 0.03)' : 'transparent',
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  <ListItemButton onClick={() => onToggle(asset)} sx={{ py: 1.2, px: 1.5 }}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Checkbox
                        edge="start"
                        checked={checked}
                        tabIndex={-1}
                        disableRipple
                        size="small"
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography fontSize="0.875rem" fontWeight={checked ? 600 : 400}>
                            {asset.name}
                          </Typography>
                          {checked && (
                            <Chip
                              label="Selecionado"
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: '0.65rem',
                                fontWeight: 600,
                                backgroundColor: '#201A47',
                                color: '#fff',
                              }}
                            />
                          )}
                        </Stack>
                      }
                      secondary={secondary}
                      secondaryTypographyProps={{ fontSize: '0.78rem', color: 'text.secondary' }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </Box>
      ))}
    </Stack>
  );
}
