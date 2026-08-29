import { Paper } from '@mui/material';
import { glass } from '../theme/theme.js';

export default function GlassCard({ sx = {}, children, ...rest }) {
  return (
    <Paper elevation={0} sx={{ ...glass(), ...sx }} {...rest}>
      {children}
    </Paper>
  );
}
