import {
  Checkbox,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import type { GlpiAsset } from '../../types';

interface AssetListProps {
  assets: GlpiAsset[];
  selectedIds: number[];
  onToggle: (asset: GlpiAsset) => void;
}

/**
 * Lista de equipamentos atribuidos ao colaborador, com checkboxes para
 * selecionar quais devem constar no Termo de Responsabilidade.
 */
export function AssetList({ assets, selectedIds, onToggle }: AssetListProps) {
  if (assets.length === 0) {
    return (
      <Typography color="text.secondary" py={2}>
        Nenhum equipamento atribuído a este colaborador foi encontrado no GLPI.
      </Typography>
    );
  }

  return (
    <List disablePadding>
      {assets.map((asset) => {
        const identifier = asset.inventoryNumber ?? asset.serial ?? `#${asset.id}`;
        const checked = selectedIds.includes(asset.id);

        return (
          <ListItem key={`${asset.itemtype}-${asset.id}`} disablePadding divider>
            <ListItemButton onClick={() => onToggle(asset)} dense>
              <ListItemIcon>
                <Checkbox edge="start" checked={checked} tabIndex={-1} disableRipple />
              </ListItemIcon>
              <ListItemText
                primary={asset.name}
                secondary={`${identifier} · ${asset.itemtype}`}
              />
            </ListItemButton>
          </ListItem>
        );
      })}
    </List>
  );
}
