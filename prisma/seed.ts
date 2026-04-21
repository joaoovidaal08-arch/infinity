import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { CreativeMode, FormatType } from "../generated/prisma/enums";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run seed.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "admin@infinity.local" },
    update: { name: "Infinity Admin" },
    create: {
      email: "admin@infinity.local",
      name: "Infinity Admin",
    },
  });

  const workspace = await prisma.workspace.upsert({
    where: { id: "workspace_default" },
    update: { name: "Infinity Workspace", ownerId: user.id },
    create: {
      id: "workspace_default",
      name: "Infinity Workspace",
      ownerId: user.id,
    },
  });

  const brand = await prisma.brand.upsert({
    where: { id: "brand_default" },
    update: { workspaceId: workspace.id },
    create: {
      id: "brand_default",
      workspaceId: workspace.id,
      name: "Infinity Brand",
      toneOfVoice: "Direto, claro e persuasivo",
      paletteJson: {
        primary: "#111111",
        secondary: "#F5F5F5",
        accent: "#0EA5E9",
      },
      fontConfigJson: {
        heading: "Inter",
        body: "Inter",
      },
    },
  });

  const creativeProfiles = [
    {
      id: "cp_minimal",
      name: "Minimal Twitter",
      mode: CreativeMode.minimal_twitter,
      visualDensity: 20,
      contrastLevel: 85,
      typographyWeight: 80,
      spacingLevel: 90,
      graphicsIntensity: 10,
    },
    {
      id: "cp_viral",
      name: "Viral Bold",
      mode: CreativeMode.viral_bold,
      visualDensity: 70,
      contrastLevel: 90,
      typographyWeight: 90,
      spacingLevel: 55,
      graphicsIntensity: 65,
    },
    {
      id: "cp_hybrid",
      name: "Hybrid 70/30",
      mode: CreativeMode.hybrid,
      visualDensity: 45,
      contrastLevel: 88,
      typographyWeight: 84,
      spacingLevel: 75,
      graphicsIntensity: 35,
    },
  ];

  for (const profile of creativeProfiles) {
    await prisma.creativeProfile.upsert({
      where: { id: profile.id },
      update: {
        brandId: brand.id,
        ...profile,
      },
      create: {
        brandId: brand.id,
        ...profile,
        tokensJson: {
          stylePreset: profile.mode,
        },
      },
    });
  }

  await prisma.project.upsert({
    where: { id: "project_default" },
    update: {
      brandId: brand.id,
      creativeProfileId: "cp_hybrid",
    },
    create: {
      id: "project_default",
      brandId: brand.id,
      creativeProfileId: "cp_hybrid",
      name: "Projeto Base Infinity",
      description: "Projeto padrao para gerar carrosseis e stories.",
    },
  });

  const templateCombos: Array<{
    name: string;
    formatType: FormatType;
    creativeMode: CreativeMode;
    configJson: Record<string, unknown>;
  }> = [
    {
      name: "Feed Minimal",
      formatType: FormatType.feed_square,
      creativeMode: CreativeMode.minimal_twitter,
      configJson: { width: 1080, height: 1080, style: "clean_text" },
    },
    {
      name: "Story Minimal",
      formatType: FormatType.story_vertical,
      creativeMode: CreativeMode.minimal_twitter,
      configJson: { width: 1080, height: 1920, style: "clean_text_vertical" },
    },
    {
      name: "Feed Viral",
      formatType: FormatType.feed_square,
      creativeMode: CreativeMode.viral_bold,
      configJson: { width: 1080, height: 1080, style: "bold_hook" },
    },
    {
      name: "Story Viral",
      formatType: FormatType.story_vertical,
      creativeMode: CreativeMode.viral_bold,
      configJson: { width: 1080, height: 1920, style: "bold_hook_vertical" },
    },
    {
      name: "Feed Hybrid",
      formatType: FormatType.feed_square,
      creativeMode: CreativeMode.hybrid,
      configJson: { width: 1080, height: 1080, style: "hybrid_focus" },
    },
    {
      name: "Story Hybrid",
      formatType: FormatType.story_vertical,
      creativeMode: CreativeMode.hybrid,
      configJson: { width: 1080, height: 1920, style: "hybrid_focus_vertical" },
    },
  ];

  for (const tpl of templateCombos) {
    await prisma.template.upsert({
      where: {
        name_formatType_creativeMode: {
          name: tpl.name,
          formatType: tpl.formatType,
          creativeMode: tpl.creativeMode,
        },
      },
      update: { ...tpl, isActive: true },
      create: { ...tpl, isActive: true },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seed executado com sucesso.");
  })
  .catch(async (error) => {
    await prisma.$disconnect();
    console.error(error);
    process.exit(1);
  });
