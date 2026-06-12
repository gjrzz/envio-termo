import {
  Checkbox,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Typography,
} from '@mui/material';
import type { GlpiAsset } from '../../types';

interface AssetListProps {
  assets: GlpiAsset[];
  selectedKeys: string[];
  onToggle: (asset: GlpiAsset) => void;
}

/**
 * Identificador unico de um ativo, combinando itemtype e id (o id por si so
 * nao e unico entre itemtypes diferentes do GLPI).
 */
export function getAssetKey(asset: Pick<GlpiAsset, 'id' | 'itemtype'>): string {
  return `${asset.itemtype}-${asset.id}`;
}

/**
 * Categorias de ativos exibidas na lista, na ordem em que devem aparecer.
 */
const CATEGORIES: { itemtype: string; emoji: string; label: string }[] = [
  { itemtype: 'Computer', emoji: '💻', label: 'Computadores' },
  { itemtype: 'Monitor', emoji: '🖥', label: 'Monitores' },
  { itemtype: 'Peripheral', emoji: '⌨️', label: 'Periféricos' },
  { itemtype: 'Phone', emoji: '📱', label: 'Telefones' },
  { itemtype: 'Printer', emoji: '🖨️', label: 'Impressoras' },
];

/**
 * Lista de equipamentos atribuidos ao colaborador, agrupados por categoria
 * (Computadores, Monitores, Periféricos, etc.), com checkboxes para
 * selecionar quais devem constar no Termo de Responsabilidade.
 */
export function AssetList({ assets, selectedKeys, onToggle }: AssetListProps) {
  if (assets.length === 0) {
    return (
      <Typography color="text.secondary" py={2}>
        Nenhum equipamento atribuído a este colaborador foi encontrado no GLPI.
      </Typography>
    );
  }

  const groups = CATEGORIES.map((category) => ({
    ...category,
    items: assets.filter((asset) => asset.itemtype === category.itemtype),
  })).filter((group) => group.items.length > 0);

  const knownItemtypes = new Set(CATEGORIES.map((category) => category.itemtype));
  const otherItems = assets.filter((asset) => !knownItemtypes.has(asset.itemtype));

  if (otherItems.length > 0) {
    groups.push({ itemtype: 'Other', emoji: '📦', label: 'Outros', items: otherItems });
  }

  return (
    <List disablePadding>
      {groups.map((group) => (
        <li key={group.itemtype}>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            <ListSubheader disableSticky>
              {group.emoji} {group.label}
            </ListSubheader>

            {group.items.map((asset) => {
              const identifier = asset.inventoryNumber ?? asset.serial ?? `#${asset.id}`;
              const key = getAssetKey(asset);
              const checked = selectedKeys.includes(key);

              return (
                <ListItem key={key} disablePadding divider>
                  <ListItemButton onClick={() => onToggle(asset)} dense>
                    <ListItemIcon>
                      <Checkbox edge="start" checked={checked} tabIndex={-1} disableRipple />
                    </ListItemIcon>
                    <ListItemText primary={asset.name} secondary={identifier} />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </ul>
        </li>
      ))}
    </List>
  );
}
