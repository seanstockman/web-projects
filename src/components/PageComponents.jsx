import { Stack, Container } from "@mui/material";

export const PageStack = (props) => (
    //<Container>
    <Stack
        spacing={{ xs: 2, sm: 2, md: 4 }}
        sx={{ paddingY: 4 }}
        {...props}
    />
    //</Container>
);