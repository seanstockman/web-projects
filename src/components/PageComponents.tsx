import { Stack, Container, type StackProps } from "@mui/material";

export const PageStack = (props: StackProps) => (
    //<Container>
    <Stack
        spacing={{ xs: 2, sm: 2, md: 4 }}
        sx={{ paddingY: 4 }}
        {...props}
    />
    //</Container>
);